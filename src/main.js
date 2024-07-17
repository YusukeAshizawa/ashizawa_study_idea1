import { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory, uuidV4 } from "../node_modules/@skyway-sdk/room";  // デバッグ用
// import { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory, uuidV4 } from "@skyway-sdk/room";

const Screen_width = 1332;  // 端末のスクリーンの横幅（スクリーンの中心を用いるために利用）
const Screen_height = 571;  // 端末のスクリーンの縦幅（スクリーンの中心を用いるために利用）

var fc_d_from_fc_vector_length = 0;  // MediaPipeを用いて取得したベクトルの大きさ
var radian = 0;  // MediaPipeを用いて取得した頭部方向（ラジアン）

var webSocket;  // ウェブソケット

// サーバとの通信を接続する関数
function connect() {
  webSocket = new WebSocket("ws://localhost:8765");  // インスタンスを作成し，サーバと接続

  // ソケット接続すれば呼び出す関数
  webSocket.onopen = function(message) {
    console.log("Server connect... OK\n");
  }

  // ソケット接続が切れると呼び出す関数
  webSocket.onclose = function(message) {
    console.log("Server Disconnect... OK\n");
  }

  // ソケット通信中でエラーが発生すれば呼び出す関数
  webSocket.onerror = function(message) {
    console.log("connect Error...\n");
  }

  // ソケット接続すれば呼び出す関数
  webSocket.onmessage = function(message) {
    console.log(message.data);
  }
}

const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  scope: {
    app: {
      id: "78d4247e-9c81-45c4-a3ad-cad69d3fa502",
      turn: true,
      actions: ["read"],
      channels: [
        {
          id: "*",
          name: "*",
          actions: ["write"],
          members: [
            {
              id: "*",
              name: "*",
              actions: ["write"],
              publication: {
                actions: ["write"],
              },
              subscription: {
                actions: ["write"],
              },
            },
          ],
          sfuBots: [
            {
              actions: ["write"],
              forwardings: [
                {
                  actions: ["write"],
                },
              ],
            },
          ],
        },
      ],
    },
  },
}).encode("q30eIW0sHi102yMNovcPpJm31EX/AbcjpsZnjHbOmoI=");

(async () => {
  const localVideo = document.getElementById("local-video");
  const buttonArea = document.getElementById("button-area");
  const remoteMediaArea = document.getElementById("remote-media-area");
  const roomNameInput = document.getElementById("room-name");

  const myId = document.getElementById("my-id");
  const joinButton = document.getElementById("join");

  connect();

  // Flaskのエンドポイントからデータを取得する
  // fetch("/data")
  // .then(response => response.json())
  // .then(data => {
  //   // 取得したデータを変数に代入
  //   fc_d_from_fc_vector_length = data.fc_d_from_fc_vector_length;
  //   radian = data.radian;
  //   console.log("fc_d_from_fc_vector_length = ", fc_d_from_fc_vector_length); // デバッグ用
  //   console.log("radian = ", radian); // デバッグ用
  // })
  // .catch(error => console.error("Error:", error));
  
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo != null) {
    // 自分のウィンドウの削除？
    localVideo.width = 0;  // ウィンドウの横幅変更
    localVideo.height = 0;  // ウィンドウの縦幅変更

    // 相手が映るウィンドウの位置・大きさの変更
    remoteVideo.width = 500;  // ウィンドウの横幅変更
    remoteVideo.height = 500;  // ウィンドウの縦幅変更

    $(function () {
      $('#local-video').offset({ left: Screen_width/2, top: Screen_height/2 });
      $('#remote-video').offset({ left: Screen_width/2, top: Screen_height/2 });
    });
  }
  else {
    // 自分のウィンドウの位置・大きさの変更（デバッグ用）
    localVideo.width = 500;  // ウィンドウの横幅変更
    localVideo.height = 500;  // ウィンドウの縦幅変更

    $(function () {
      $('#local-video').offset({ left: Screen_width/2, top: Screen_height/2 });
    });
  }

  // デバッグ用
  // $(function () {
  //   var off = $('#local-video').offset();
  //   console.log('top: ' + off.top);
  //   console.log('left: ' + off.left);
  // });

  const { audio, video } =
    await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
  video.attach(localVideo);
  await localVideo.play();

  joinButton.onclick = async () => {
    if (roomNameInput.value === "") return;

    const context = await SkyWayContext.Create(token);
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: "p2p",
      name: roomNameInput.value,
    });
    const me = await room.join();

    myId.textContent = me.id;

    await me.publish(audio);
    await me.publish(video);

    const subscribeAndAttach = (publication) => {
      if (publication.publisher.id === me.id) return;

      const subscribeButton = document.createElement("button");
      subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;
      buttonArea.appendChild(subscribeButton);

      subscribeButton.onclick = async () => {
        const { stream } = await me.subscribe(publication.id);

        let newMedia;
        switch (stream.track.kind) {
          case "video":
            newMedia = document.createElement("video");
            newMedia.playsInline = true;
            newMedia.autoplay = true;
            newMedia.muted = true;
            newMedia.id = "remote-video";
            break;
          case "audio":
            newMedia = document.createElement("audio");
            newMedia.controls = true;
            newMedia.autoplay = true;
            newMedia.id = "remote-audio";
            break;
          default:
            return;
        }
        stream.attach(newMedia);
        remoteMediaArea.appendChild(newMedia);
      };
    };

    room.publications.forEach(subscribeAndAttach);
    room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));

  };
})();