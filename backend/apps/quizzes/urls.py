from django.urls import path
from .views import (
    QuizListCreateView, QuizDetailView,
    StartAttemptView, SubmitAnswerView,
    CompleteAttemptView, AttemptDetailView, AttemptListView,
)

urlpatterns = [
    # Quiz CRUD
    path('quizzes/', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('quizzes/<int:quiz_id>/', QuizDetailView.as_view(), name='quiz-detail'),

    # Attempt management
    path('quizzes/<int:quiz_id>/attempts/', StartAttemptView.as_view(), name='start-attempt'),
    path('attempts/', AttemptListView.as_view(), name='attempt-list'),
    path('attempts/<int:attempt_id>/', AttemptDetailView.as_view(), name='attempt-detail'),
    path('attempts/<int:attempt_id>/answers/', SubmitAnswerView.as_view(), name='submit-answer'),
    path('attempts/<int:attempt_id>/complete/', CompleteAttemptView.as_view(), name='complete-attempt'),
]
