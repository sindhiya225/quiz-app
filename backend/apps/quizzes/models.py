from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Quiz(models.Model):
    """
    Represents a generated quiz. One user can have many quizzes.
    A Quiz is immutable after generation — the AI output is stored
    as-is so results are reproducible when retaking.
    """
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255)
    topic = models.CharField(max_length=255)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    num_questions = models.PositiveIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class Question(models.Model):
    """
    A single multiple-choice question belonging to a Quiz.
    Options are stored as a JSON array for simplicity — this avoids
    a separate OptionChoice table while keeping data queryable.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    # Stored as list of strings: ["Option A", "Option B", "Option C", "Option D"]
    options = models.JSONField()
    # Index into options array (0-3) — storing index is more robust than storing text
    correct_option_index = models.PositiveIntegerField()
    explanation = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.text[:50]}"


class QuizAttempt(models.Model):
    """
    Records one attempt by a user at a specific quiz.
    Users can retake quizzes, creating a new attempt each time.
    This allows tracking improvement over time.
    """
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='in_progress')
    score = models.PositiveIntegerField(null=True, blank=True)  # number of correct answers
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    @property
    def score_percentage(self):
        if self.score is None or self.quiz.num_questions == 0:
            return 0
        return round((self.score / self.quiz.num_questions) * 100)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} ({self.status})"


class Answer(models.Model):
    """
    Records a single answer within an attempt.
    Separated from QuizAttempt so we can review each question's response.
    selected_option_index is nullable to handle skipped questions.
    """
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    selected_option_index = models.PositiveIntegerField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent duplicate answers for the same question in one attempt
        unique_together = ('attempt', 'question')

    def __str__(self):
        return f"Attempt {self.attempt.id} - Q{self.question.order}: {'✓' if self.is_correct else '✗'}"
