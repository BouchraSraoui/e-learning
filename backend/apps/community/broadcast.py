from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def group_name(slug: str) -> str:
    return f'chat_{slug}'


def broadcast(slug: str, event: dict) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(group_name(slug), event)
