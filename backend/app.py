from flask import Flask, Response, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import imutils
import threading
import time
import datetime
import os

app = Flask(__name__)
CORS(app)

# ================== EXISTING STATE ==================
state = {
    "status": "Normal",
    "motion_count": 0,
    "fps": 0,
    "running": False,
}

camera = None
lock = threading.Lock()
output_frame = None
first_frame = None
area = 500

# ================== NEW RECORDING STATE ==================
recording = False
video_writer = None
current_file = ""

# create recordings folder
if not os.path.exists("recordings"):
    os.makedirs("recordings")

# ================== FRAME CAPTURE ==================
def capture_frames():
    global camera, output_frame, first_frame, state
    global recording, video_writer

    camera = cv2.VideoCapture(0)
    state["running"] = True
    prev_time = time.time()
    frame_count = 0

    while state["running"]:
        ret, img = camera.read()
        if not ret:
            break

        img = imutils.resize(img, width=640)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gaussian = cv2.GaussianBlur(gray, (21, 21), 0)

        if first_frame is None:
            first_frame = gaussian
            continue

        diff = cv2.absdiff(first_frame, gaussian)
        thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)

        cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)

        motion_detected = False
        for c in cnts:
            if cv2.contourArea(c) < area:
                continue
            (x, y, w, h) = cv2.boundingRect(c)
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 100), 2)
            motion_detected = True

        state["status"] = "Motion Detected" if motion_detected else "Normal"
        if motion_detected:
            state["motion_count"] += 1

        # ================== RECORDING WRITE ==================
        if recording and video_writer is not None:
            video_writer.write(img)

        # FPS calculation
        frame_count += 1
        now = time.time()
        elapsed = now - prev_time
        if elapsed >= 1.0:
            state["fps"] = round(frame_count / elapsed, 1)
            frame_count = 0
            prev_time = now

        # Overlay
        color = (0, 255, 100) if motion_detected else (100, 200, 255)
        cv2.putText(img, f"Status: {state['status']}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        cv2.putText(img, f"FPS: {state['fps']}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        # RECORDING TEXT
        if recording:
            cv2.putText(img, "● REC", (540, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        with lock:
            output_frame = img.copy()

    camera.release()
    state["running"] = False

# ================== STREAM ==================
def generate_stream():
    global output_frame
    while True:
        with lock:
            if output_frame is None:
                continue
            ret, buffer = cv2.imencode(".jpg", output_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if not ret:
                continue
            frame_bytes = buffer.tobytes()

        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        time.sleep(0.03)

# ================== ROUTES ==================
@app.route("/video_feed")
def video_feed():
    return Response(generate_stream(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/status")
def get_status():
    return jsonify(state)

@app.route("/start", methods=["POST"])
def start():
    global first_frame
    if not state["running"]:
        first_frame = None
        state["motion_count"] = 0
        t = threading.Thread(target=capture_frames, daemon=True)
        t.start()
        return jsonify({"message": "Camera started"})
    return jsonify({"message": "Already running"})

@app.route("/stop", methods=["POST"])
def stop():
    state["running"] = False
    return jsonify({"message": "Camera stopped"})

@app.route("/reset", methods=["POST"])
def reset():
    global first_frame
    first_frame = None
    state["motion_count"] = 0
    return jsonify({"message": "Background reference reset"})

# ================== NEW RECORDING APIs ==================

@app.route("/start_recording", methods=["POST"])
def start_recording():
    global recording, video_writer, current_file

    if not state["running"]:
        return jsonify({"error": "Camera not running"})

    filename = datetime.datetime.now().strftime("%Y%m%d_%H%M%S.avi")
    filepath = os.path.join("recordings", filename)

    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    video_writer = cv2.VideoWriter(filepath, fourcc, 20.0, (640, 480))

    recording = True
    current_file = filename

    return jsonify({"message": "Recording started", "file": filename})

@app.route("/stop_recording", methods=["POST"])
def stop_recording():
    global recording, video_writer

    recording = False
    if video_writer:
        video_writer.release()
        video_writer = None

    return jsonify({"message": "Recording stopped"})

@app.route("/download/<filename>")
def download_file(filename):
    return send_from_directory("recordings", filename, as_attachment=True)

# ================== AUTO START ==================
if __name__ == "__main__":
    t = threading.Thread(target=capture_frames, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)