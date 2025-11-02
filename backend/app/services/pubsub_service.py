"""
Simple pub/sub service for Event Rescue
"""
from typing import Dict, Any, List, Callable
import asyncio

class Broadcaster:
    def __init__(self):
        self.subscribers: List[Callable] = []
        # Keep list of websocket send coroutines for HTTP clients
        self.ws_clients: List[Callable[[Dict[str, Any]], None]] = []
    
    def subscribe(self, callback: Callable):
        """Subscribe to broadcasts."""
        self.subscribers.append(callback)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all subscribers."""
        for subscriber in self.subscribers:
            try:
                if asyncio.iscoroutinefunction(subscriber):
                    await subscriber(message)
                else:
                    subscriber(message)
            except Exception as e:
                print(f"Error broadcasting to subscriber: {e}")
        # Also forward message to websocket clients (if any)
        for ws_send in list(self.ws_clients):
            try:
                # ws_send is an async callable that accepts message (dict)
                await ws_send(message)
            except Exception as e:
                print(f"Error sending to ws client: {e}")

    def register_ws_client(self, send_callable: Callable[[Dict[str, Any]], None]):
        self.ws_clients.append(send_callable)

    def unregister_ws_client(self, send_callable: Callable[[Dict[str, Any]], None]):
        try:
            self.ws_clients.remove(send_callable)
        except ValueError:
            pass

# Global broadcaster instance
broadcaster = Broadcaster()
