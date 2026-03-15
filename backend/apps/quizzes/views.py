from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Quiz, Question, QuizAttempt, Answer
from .serializers import (
    QuizListSerializer, QuizDetailSerializer, CreateQuizSerializer,
    QuizAttemptListSerializer, QuizAttemptDetailSerializer,
    SubmitAnswerSerializer,
)
from .ai_service import generate_quiz_questions


class QuizListCreateView(APIView):
    """
    GET  /api/quizzes/      — list user's quizzes
    POST /api/quizzes/      — create a new AI-generated quiz
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quizzes = Quiz.objects.filter(user=request.user)
        serializer = QuizListSerializer(quizzes, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CreateQuizSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        topic = serializer.validated_data['topic']
        num_questions = serializer.validated_data['num_questions']
        difficulty = serializer.validated_data['difficulty']

        # Generate questions via AI
        try:
            ai_questions = generate_quiz_questions(topic, num_questions, difficulty)
        except RuntimeError as e:
            return Response(
                {'error': f'AI service unavailable: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except ValueError as e:
            return Response(
                {'error': f'AI returned invalid data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Create the quiz and questions in a single transaction
        quiz = Quiz.objects.create(
            user=request.user,
            title=f"{topic.title()} Quiz",
            topic=topic,
            difficulty=difficulty,
            num_questions=len(ai_questions),
        )

        for i, q_data in enumerate(ai_questions):
            Question.objects.create(
                quiz=quiz,
                text=q_data['text'],
                options=q_data['options'],
                correct_option_index=q_data['correct_option_index'],
                explanation=q_data['explanation'],
                order=i + 1,
            )

        return Response(QuizDetailSerializer(quiz).data, status=status.HTTP_201_CREATED)


class QuizDetailView(APIView):
    """
    GET /api/quizzes/<id>/  — get quiz details with questions
    """
    permission_classes = [IsAuthenticated]

    def get_quiz(self, quiz_id, user):
        try:
            return Quiz.objects.get(id=quiz_id, user=user)
        except Quiz.DoesNotExist:
            return None

    def get(self, request, quiz_id):
        quiz = self.get_quiz(quiz_id, request.user)
        if not quiz:
            return Response({'error': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = QuizDetailSerializer(quiz)
        return Response(serializer.data)


class StartAttemptView(APIView):
    """
    POST /api/quizzes/<id>/attempts/
    Starts a new quiz attempt. If the user has an in-progress attempt,
    it returns that instead of creating a duplicate.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        try:
            quiz = Quiz.objects.get(id=quiz_id, user=request.user)
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Return existing in-progress attempt if one exists
        existing = QuizAttempt.objects.filter(
            user=request.user, quiz=quiz, status='in_progress'
        ).first()
        if existing:
            serializer = QuizAttemptDetailSerializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

        attempt = QuizAttempt.objects.create(user=request.user, quiz=quiz)
        serializer = QuizAttemptDetailSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubmitAnswerView(APIView):
    """
    POST /api/attempts/<attempt_id>/answers/
    Submit or update an answer for a question within an attempt.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        try:
            attempt = QuizAttempt.objects.get(id=attempt_id, user=request.user)
        except QuizAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found.'}, status=status.HTTP_404_NOT_FOUND)

        if attempt.status == 'completed':
            return Response(
                {'error': 'This attempt is already completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SubmitAnswerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question_id = serializer.validated_data['question_id']
        selected_index = serializer.validated_data['selected_option_index']

        try:
            question = Question.objects.get(id=question_id, quiz=attempt.quiz)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found in this quiz.'}, status=status.HTTP_404_NOT_FOUND)

        is_correct = (selected_index == question.correct_option_index)

        # Update or create (idempotent — user can change answer before submitting)
        answer, created = Answer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={
                'selected_option_index': selected_index,
                'is_correct': is_correct,
            }
        )

        return Response({
            'answer_id': answer.id,
            'is_correct': is_correct,
            'correct_option_index': question.correct_option_index,
        }, status=status.HTTP_200_OK)


class CompleteAttemptView(APIView):
    """
    POST /api/attempts/<attempt_id>/complete/
    Finalises the attempt, calculates the score.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        try:
            attempt = QuizAttempt.objects.get(id=attempt_id, user=request.user)
        except QuizAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found.'}, status=status.HTTP_404_NOT_FOUND)

        if attempt.status == 'completed':
            serializer = QuizAttemptDetailSerializer(attempt)
            return Response(serializer.data)

        score = attempt.answers.filter(is_correct=True).count()
        attempt.score = score
        attempt.status = 'completed'
        attempt.completed_at = timezone.now()
        attempt.save()

        serializer = QuizAttemptDetailSerializer(attempt)
        return Response(serializer.data)


class AttemptDetailView(APIView):
    """
    GET /api/attempts/<attempt_id>/
    Returns full attempt details including all answers — used for results page.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        try:
            attempt = QuizAttempt.objects.get(id=attempt_id, user=request.user)
        except QuizAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = QuizAttemptDetailSerializer(attempt)
        return Response(serializer.data)


class AttemptListView(generics.ListAPIView):
    """
    GET /api/attempts/
    Lists all of the current user's quiz attempts (history).
    """
    serializer_class = QuizAttemptListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(
            user=self.request.user,
            status='completed'
        ).select_related('quiz')
