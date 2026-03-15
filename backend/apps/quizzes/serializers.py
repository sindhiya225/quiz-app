from rest_framework import serializers
from .models import Quiz, Question, QuizAttempt, Answer


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ('id', 'text', 'options', 'order', 'explanation')
        # NOTE: correct_option_index is intentionally excluded here.
        # It's only exposed in results serializer to prevent cheating.


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Used in results view — includes the correct answer."""
    class Meta:
        model = Question
        fields = ('id', 'text', 'options', 'correct_option_index', 'explanation', 'order')


class QuizListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — no questions included."""
    question_count = serializers.IntegerField(source='questions.count', read_only=True)
    attempt_count = serializers.IntegerField(source='attempts.count', read_only=True)

    class Meta:
        model = Quiz
        fields = ('id', 'title', 'topic', 'difficulty', 'num_questions',
                  'question_count', 'attempt_count', 'created_at')


class QuizDetailSerializer(serializers.ModelSerializer):
    """Full quiz with questions — used when taking a quiz."""
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ('id', 'title', 'topic', 'difficulty', 'num_questions',
                  'questions', 'created_at')


class CreateQuizSerializer(serializers.Serializer):
    """Input validation for quiz creation — not a ModelSerializer
    because the actual creation involves AI generation."""
    topic = serializers.CharField(max_length=255, min_length=2)
    num_questions = serializers.IntegerField(min_value=5, max_value=20)
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])


class AnswerSerializer(serializers.ModelSerializer):
    question_id = serializers.IntegerField(source='question.id', read_only=True)
    question_text = serializers.CharField(source='question.text', read_only=True)
    question_options = serializers.JSONField(source='question.options', read_only=True)
    correct_option_index = serializers.IntegerField(
        source='question.correct_option_index', read_only=True
    )
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    question_order = serializers.IntegerField(source='question.order', read_only=True)

    class Meta:
        model = Answer
        fields = (
            'id', 'question_id', 'question_text', 'question_options',
            'selected_option_index', 'correct_option_index',
            'explanation', 'is_correct', 'question_order'
        )


class SubmitAnswerSerializer(serializers.Serializer):
    """Input for submitting a single answer."""
    question_id = serializers.IntegerField()
    selected_option_index = serializers.IntegerField(min_value=0, max_value=3)


class QuizAttemptListSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    quiz_topic = serializers.CharField(source='quiz.topic', read_only=True)
    quiz_difficulty = serializers.CharField(source='quiz.difficulty', read_only=True)
    total_questions = serializers.IntegerField(source='quiz.num_questions', read_only=True)
    score_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = QuizAttempt
        fields = (
            'id', 'quiz', 'quiz_title', 'quiz_topic', 'quiz_difficulty',
            'status', 'score', 'total_questions', 'score_percentage',
            'started_at', 'completed_at'
        )


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    """Full attempt with all answers — used for results page."""
    answers = AnswerSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    quiz_topic = serializers.CharField(source='quiz.topic', read_only=True)
    quiz_difficulty = serializers.CharField(source='quiz.difficulty', read_only=True)
    total_questions = serializers.IntegerField(source='quiz.num_questions', read_only=True)
    score_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = QuizAttempt
        fields = (
            'id', 'quiz', 'quiz_title', 'quiz_topic', 'quiz_difficulty',
            'status', 'score', 'total_questions', 'score_percentage',
            'answers', 'started_at', 'completed_at'
        )
