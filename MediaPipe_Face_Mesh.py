import cv2
import mediapipe as mp
import numpy as np
import math
from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/")
def theta_head_direction_send(value):
  return render_template('index.html', theta_head_direction=value)

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_face_mesh = mp.solutions.face_mesh
# Webカメラから入力
drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1)
cap = cv2.VideoCapture(0)
with mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5) as face_mesh:
  while cap.isOpened():
    success, image = cap.read()
    if not success:
      print("Ignoring empty camera frame.")
      continue
    image.flags.writeable = False
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image)
    # 検出された顔のメッシュをカメラ画像の上に描画
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    landmarks_pos_x = []  # 468個の点のx座標を格納するリスト
    landmarks_pos_y = []  # 468個の点のx座標を格納するリスト
    face_center_default_pos = []  # 正面を向いた際の顔の中心点（ここでは，飯塚さんの修論に倣って，鼻の先の座標としている．）
    if results.multi_face_landmarks:
      for face_landmarks in results.multi_face_landmarks:
        # 特定の顔の点を取得
        for id, lm in enumerate(face_landmarks.landmark):
          if lm.x < 0:
            landmarks_pos_x.append(0)
          elif lm.x > 1:
            landmarks_pos_x.append(1)
          else:
            landmarks_pos_x.append(lm.x)
          if lm.y < 0:
            landmarks_pos_y.append(0)
          elif lm.y > 1:
            landmarks_pos_y.append(1)
          else:
            landmarks_pos_y.append(lm.y)
          if id == 1:
            if lm.x < 0:
              face_center_default_pos.append(0)
            elif lm.x > 1:
              face_center_default_pos.append(1)
            else:
              face_center_default_pos.append(lm.x)
            if lm.y < 0:
              face_center_default_pos.append(0)
            elif lm.y > 1:
              face_center_default_pos.append(1)
            else:
              face_center_default_pos.append(lm.y)
    face_center_pos = [sum(landmarks_pos_x) / len(landmarks_pos_x),
                       sum(landmarks_pos_y) / len(landmarks_pos_y)]  # 顔の中心点の座標
    base_vector = np.array([1, 0])  # 頭部方向を計算するためのベクトル
    # print("face_center_pos = ({},{})".format(face_center_pos[0],face_center_pos[1]))  # デバッグ用
    # print("face_center_default_pos = ({},{})".format(face_center_default_pos[0],face_center_default_pos[1]))  # デバッグ用
    fc_d_from_fc_vector = np.array([face_center_default_pos[0] - face_center_pos[0], 
                                    face_center_default_pos[1] - face_center_pos[1]])  # 顔の中心点を原点とした時の，正面を向いた際の顔の中心点の座標
    rad_head_direction = np.arccos(np.inner(base_vector, fc_d_from_fc_vector)/(np.linalg.norm(base_vector) * np.linalg.norm(fc_d_from_fc_vector)))  # 頭部方向（ラジアン）
    theta_head_direction = rad_head_direction * (180 / math.pi)  # 頭部方向（度）
    if fc_d_from_fc_vector[1] < 0:  # arccosの値域が0～πであるため，上下の区別をするために，上を向いている時には，ラジアンおよび度の値を更新する必要がある
      rad_head_direction = -rad_head_direction
      theta_head_direction = math.pi * 2 - theta_head_direction
    # print("rad_head_direction = {}".format(rad_head_direction))
    print("theta_head_direction = {}".format(theta_head_direction))
    theta_head_direction_send(theta_head_direction)
    cv2.imshow('MediaPipe Face Mesh', cv2.flip(image, 1))
    if cv2.waitKey(5) & 0xFF == 27:
      break
cap.release()

if __name__ == '__main__':
    app.run(debug=True)