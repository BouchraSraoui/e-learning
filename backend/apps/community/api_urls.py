from django.urls import path

from .views import ChatRoomListView, MessageDetailView, RoomBanView, RoomMessagesView

urlpatterns = [
    path('rooms/', ChatRoomListView.as_view(), name='room-list'),
    path('rooms/<slug:slug>/messages/', RoomMessagesView.as_view(), name='room-messages'),
    path('rooms/<slug:slug>/ban/', RoomBanView.as_view(), name='room-ban'),
    path('messages/<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
]
