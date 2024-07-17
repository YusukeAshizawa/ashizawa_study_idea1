'''Echoサーバの実装'''
import asyncio
import websockets
import json

# この関数に通信しているときに行う処理を書く。
# クライアントが接続している間は下の関数が常に回っている
async def handler(websocket):
    async for message in websocket:
        # クライアントからのメッセージを取り出してそのまま送り返す（Echo）
        async for message in websocket:
            await websocket.send(message)

start_server = websockets.serve(handler, "localhost", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()