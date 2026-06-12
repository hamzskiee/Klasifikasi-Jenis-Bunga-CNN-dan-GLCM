import os
import cv2
import pickle
import base64
import requests
import numpy as np
import tensorflow as tf
from flask import Flask, render_template, request, jsonify
from skimage.feature import graycomatrix, graycoprops

app = Flask(__name__)

# =======================================================
# KONFIGURASI PATH MODEL
# =======================================================
MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    'model'
)
MODEL_PATH = os.path.join(
    MODEL_DIR,
    'flowers_model.pkl'
)

# Google Drive file ID untuk model flowers_model.pkl
MODEL_FILE_ID = "1izKhUwavn1-ob5UJEckZoJiUMKzlLqC1"

# =======================================================
# VARIABEL GLOBAL
# =======================================================
cnn_model = None
class_labels = []
target_size = (256, 256)

# =======================================================
# DOWNLOAD MODEL DARI GOOGLE DRIVE (jika belum ada)
# =======================================================
def download_model():
    """Download flowers_model.pkl dari Google Drive jika file belum ada."""

    # Buat direktori model/ jika belum ada
    os.makedirs(MODEL_DIR, exist_ok=True)

    if os.path.exists(MODEL_PATH):
        file_size = os.path.getsize(MODEL_PATH)
        print(f"[INFO] File model sudah ada: {MODEL_PATH} ({file_size / (1024*1024):.2f} MB)")
        return True

    print("=" * 60)
    print("[DOWNLOAD] Model tidak ditemukan, memulai unduhan dari Google Drive...")
    print(f"[DOWNLOAD] File ID: {MODEL_FILE_ID}")

    try:
        # URL download dari Google Drive
        url = f"https://drive.google.com/uc?export=download&id={MODEL_FILE_ID}"

        # Google Drive memerlukan confirm token untuk file besar
        session = requests.Session()
        response = session.get(url, stream=True, allow_redirects=True)

        # Cek apakah ada halaman warning/confirmation
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                url = f"https://drive.google.com/uc?export=download&confirm={value}&id={MODEL_FILE_ID}"
                response = session.get(url, stream=True, allow_redirects=True)
                break

        response.raise_for_status()

        # Tentukan total size untuk progress bar
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        # Simpan file ke disk
        with open(MODEL_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    # Tampilkan progress
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r[DOWNLOAD] Progress: {percent:.1f}% ({downloaded / (1024*1024):.2f} MB / {total_size / (1024*1024):.2f} MB)", end="")
                    else:
                        print(f"\r[DOWNLOAD] Mendownload... {downloaded / (1024*1024):.2f} MB", end="")

        print("\n[DOWNLOAD] Selesai!")
        file_size = os.path.getsize(MODEL_PATH)
        print(f"[DOWNLOAD] File tersimpan: {MODEL_PATH} ({file_size / (1024*1024):.2f} MB)")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n[DOWNLOAD ERROR] Gagal mengunduh model: {e}")
        print("[DOWNLOAD ERROR] Pastikan koneksi internet stabil dan file ID benar.")
        print("=" * 60)
        return False

# =======================================================
# LOAD MODEL
# =======================================================
def load_model_artifacts():
    global cnn_model, class_labels, target_size

    # Pastikan model sudah di-download (atau sudah ada)
    if not os.path.exists(MODEL_PATH):
        print("[INFO] Model belum ada, mencoba mendownload...")
        success = download_model()
        if not success:
            print("[ERROR] Gagal mendapatkan file model!")
            return

    try:
        print("=" * 60)
        print("[STEP 1] Memulai proses load model")
        print(f"[INFO] Path model: {MODEL_PATH}")

        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"File model tidak ditemukan: {MODEL_PATH}"
            )

        print("[STEP 2] Membuka file .pkl")
        with open(MODEL_PATH, "rb") as f:
            print("[STEP 3] Membaca isi pickle")
            loaded_pkg = pickle.load(f)

        print("[STEP 4] Pickle berhasil dibaca")
        print(f"[INFO] Tipe objek: {type(loaded_pkg)}")

        if not isinstance(loaded_pkg, dict):
            raise ValueError(
                "Isi file .pkl bukan dictionary"
            )

        print("[STEP 5] Membuat arsitektur model CNN")
        cnn_model = tf.keras.models.model_from_json(
            loaded_pkg["model_config"]
        )

        print("[STEP 6] Memuat bobot model")
        cnn_model.set_weights(
            loaded_pkg["model_weights"]
        )

        print("[STEP 7] Memuat label kelas")
        class_labels = loaded_pkg["classes"]

        if "img_size" in loaded_pkg:
            size = loaded_pkg["img_size"]
            target_size = (
                (size, size)
                if isinstance(size, int)
                else size
            )

        print("[STEP 8] Model berhasil dimuat")
        print(f"[INFO] Classes: {class_labels}")
        print(f"[INFO] Target Size: {target_size}")
        print("=" * 60)

    except Exception as e:
        print("=" * 60)
        print("[ERROR] Gagal memuat model")
        print(f"[DETAIL] {str(e)}")
        print("=" * 60)

# =======================================================
# DOWNLOAD & LOAD MODEL SAAT APLIKASI DIJALANKAN
# =======================================================
download_model()
load_model_artifacts()

# =======================================================
# VALIDASI MODEL TERSEDIA
# =======================================================
if cnn_model is None:
    print("=" * 60)
    print("[WARNING] Model CNN gagal dimuat!")
    print("[WARNING] Server tetap berjalan, endpoint /predict akan menolak request.")
    print("=" * 60)

# =======================================================
# EKSTRAKSI FITUR GLCM
# =======================================================
def extract_glcm_features(image_bgr):
    """
    Mengekstrak 6 fitur tekstur GLCM dari gambar masukan
    """

    gray = cv2.cvtColor(
        image_bgr,
        cv2.COLOR_BGR2GRAY
    )

    glcm = graycomatrix(
        gray,
        distances=[1],
        angles=[0],
        levels=256,
        symmetric=True,
        normed=True
    )

    contrast = graycoprops(glcm, 'contrast')[0, 0]
    correlation = graycoprops(glcm, 'correlation')[0, 0]
    energy = graycoprops(glcm, 'energy')[0, 0]
    homogeneity = graycoprops(glcm, 'homogeneity')[0, 0]
    dissimilarity = graycoprops(glcm, 'dissimilarity')[0, 0]
    asm = graycoprops(glcm, 'ASM')[0, 0]

    return {
        "contrast": float(contrast),
        "correlation": float(correlation),
        "energy": float(energy),
        "homogeneity": float(homogeneity),
        "dissimilarity": float(dissimilarity),
        "asm": float(asm)
    }

# =======================================================
# HALAMAN UTAMA
# =======================================================
@app.route('/')
def home():
    return render_template('index.html')

# =======================================================
# API PREDIKSI
# =======================================================
@app.route('/predict', methods=['POST'])
def predict():

    if 'file' not in request.files:
        return jsonify({
            "error": "Tidak ada file yang diunggah"
        }), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({
            "error": "File kosong"
        }), 400

    try:
        # =====================
        # 0. Baca file asli untuk original image (sebelum OpenCV)
        # =====================
        img_bytes = file.read()

        # === ORIGINAL IMAGE: langsung dari bytes file asli, TANPA OpenCV ===
        # Ini memastikan original image identik dengan preview utama di frontend
        mime_type = "image/jpeg"
        if file.filename and file.filename.lower().endswith('.png'):
            mime_type = "image/png"
        orig_base64 = base64.b64encode(img_bytes).decode('utf-8')
        original_data_url = f"data:{mime_type};base64,{orig_base64}"
        print("[DEBUG] Original image generated from raw file bytes (no OpenCV)")

        np_arr = np.frombuffer(
            img_bytes,
            np.uint8
        )

        img = cv2.imdecode(
            np_arr,
            cv2.IMREAD_COLOR
        )

        if img is None:
            return jsonify({
                "error": "Format gambar tidak valid"
            }), 400

        # =====================
        # 1. Ekstraksi GLCM
        # =====================
        glcm_features = extract_glcm_features(img)

        # =====================
        # 2. Generate Grayscale Image (Preprocessing Pipeline)
        # =====================

        # Grayscale image: proses identik dengan fungsi GLCM extract_glcm_features
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, gray_jpeg = cv2.imencode('.jpg', gray_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        gray_base64 = base64.b64encode(gray_jpeg.tobytes()).decode('utf-8')
        grayscale_data_url = f"data:image/jpeg;base64,{gray_base64}"
        print("[DEBUG] Grayscale image generated")

        # =====================
        # 3. Cek ketersediaan model
        # =====================
        if cnn_model is None:
            return jsonify({
                "error": "Model CNN belum dimuat. Periksa file flowers_model.pkl."
            }), 500

        # =====================
        # 3. Preprocessing CNN
        # =====================
        # Catatan: cv2.resize( img, (width, height) )
        # Model dilatih dgn IMG_SIZE=256 (height=256, width=256) -> sama
        img_resized = cv2.resize(
            img,
            (target_size[1], target_size[0])
        )

        img_rgb = cv2.cvtColor(
            img_resized,
            cv2.COLOR_BGR2RGB
        )

        # === NORMALISASI KRITIS ===
        # Model dilatih di Colab menggunakan:
        #   ImageDataGenerator(rescale=1./255)
        # Tanpa rescale /255, input pixel [0..255] masuk ke model
        # yg terlatih dgn rentang [0..1], menyebabkan aktivasi jenuh
        # dan softmax bias ke kelas pertama (daisy).
        img_normalized = img_rgb.astype(np.float32) / 255.0

        input_array = np.expand_dims(
            img_normalized,
            axis=0
        )

        # =====================
        # 4. Prediksi CNN
        # =====================
        predictions = cnn_model.predict(
            input_array,
            verbose=0
        )[0]

        predicted_idx = int(np.argmax(
            predictions
        ))

        class_name = class_labels[
            predicted_idx
        ]

        confidence = float(
            predictions[predicted_idx] * 100
        )

        probabilities = [
            float(p * 100)
            for p in predictions
        ]

        # =====================
        # DEBUG LOGGING
        # =====================
        print("=" * 60)
        print("[DEBUG PREDICT]")
        print(f"  class_labels: {class_labels}")
        print(f"  raw_predictions (softmax): {[f'{p:.6f}' for p in predictions]}")
        print(f"  predicted_idx: {predicted_idx}")
        print(f"  class_name: {class_name}")
        print(f"  confidence: {confidence:.2f}%")
        print("=" * 60)

        return jsonify({
            "class_name": class_name,
            "confidence": confidence,
            "glcm": glcm_features,
            "labels": class_labels,
            "probabilities": probabilities,
            "original_image": original_data_url,
            "grayscale_image": grayscale_data_url
        })

    except Exception as e:
        print(f"[ERROR PREDICTION] {e}")

        return jsonify({
            "error": str(e)
        }), 500

# =======================================================
# ERROR HANDLER 404
# =======================================================
@app.errorhandler(404)
def page_not_found(e):
    return render_template(
        '404.html'
    ), 404

# =======================================================
# MAIN
# =======================================================
if __name__ == '__main__':
    app.run(
        debug=True,
        port=5000
    )