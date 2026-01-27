import os
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json
import os
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from apscheduler.schedulers.background import BackgroundScheduler

# ==========================================
# 1. KONFIGURASI GEMINI
# ==========================================
# 🔴 PASTE API KEY GEMINI KAMU DI SINI (JANGAN SALAH COPAS!)
GEMINI_API_KEY = "AIzaSyC2t4yx64PIvQxZCss1Jhpl2tS7fxjTY3c"

# Pastikan file json Firebase tetap ada di folder ini
FIREBASE_KEY_FILE = "serviceAccountKey.json"

# ==========================================
# 2. SETUP SYSTEM
# ==========================================
# Setting Otak Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('models/gemini-robotics-er-1.5-preview')

# Setting Database Firebase
if not os.path.exists(FIREBASE_KEY_FILE):
    print(f"❌ ERROR: File {FIREBASE_KEY_FILE} tidak ditemukan!")
    exit()

cred = credentials.Certificate(FIREBASE_KEY_FILE)
firebase_admin.initialize_app(cred)
db = firestore.client()

app = Flask(__name__)
CORS(app)
print("✅ Sistem Logistik (Powered by Gemini) Siap Dinyalakan!")

# ==========================================
# 3. FUNGSI LOGIKA (DATABASE)
# ==========================================
def cek_status_pengiriman(resi):
    """Cari data di Firebase berdasarkan No Resi"""
    print(f"🔍 Gemini mencari resi: {resi}...")
    
    # Query ke Firestore
    docs = db.collection('delivery_planning').where('shipmentNo', '==', resi).stream()
    
    found_data = []
    for doc in docs:
        found_data.append(doc.to_dict())
        
    if not found_data:
        return None
    
    data = found_data[0]
    
    # Format Jawaban WA
    return (
        f"📦 *STATUS PENGIRIMAN*\n"
        f"Resi: {data.get('shipmentNo')}\n"
        f"Customer: {data.get('customer')}\n"
        f"Tujuan: {data.get('destination')}\n"
        f"Status: *{data.get('status', '').upper()}*\n"
        f"Posisi: {data.get('lastLocation', 'Sedang dalam perjalanan')}\n"
        f"Armada: {data.get('assignedPlate', '-')}"
    )

def tanya_gemini(pesan_user):
    """Otak AI untuk analisis pesan user"""
    prompt = f"""
    Kamu adalah Customer Service Logistik yang cerdas.
    Tugasmu membaca pesan user dan memutuskan tindakan dalam format JSON.
    
    ATURAN:
    1. Jika user memberikan No Resi (Contoh: DN-2026-001, atau format lain), ekstrak nomornya.
       Output JSON: {{"action": "check", "resi": "NOMOR_RESI"}}
       
    2. Jika user menyapa, marah, atau tanya hal umum.
       Output JSON: {{"action": "chat", "reply": "Jawaban sopan kamu disini"}}
       
    Pesan User: "{pesan_user}"
    
    Jawab HANYA JSON murni tanpa format markdown.
    """
    
    try:
        response = model.generate_content(prompt)
        # Bersihkan format jika Gemini memberi ```json
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        return clean_text
    except Exception as e:
        print(f"Error Gemini: {e}")
        return '{"action": "chat", "reply": "Maaf, sistem AI sedang sibuk."}'

# ==========================================
# 4. JALUR KOMUNIKASI (WEBHOOK)
# ==========================================
@app.route('/', methods=['GET'])
def home():
    return "Gemini Logistics Bot is Active! 🤖"

@app.route('/webhook', methods=['POST'])
def whatsapp_webhook():
    data = request.json
    
    # Tangkap pesan (sesuaikan dengan format provider WA kamu)
    pesan_masuk = data.get('message') or data.get('text') or ""
    sender = data.get('sender') or "Unknown"

    print(f"📩 Pesan dari {sender}: {pesan_masuk}")

    if not pesan_masuk:
        return jsonify({"status": "ignored"}), 200

    # 1. Analisis pakai Gemini
    try:
        raw_response = tanya_gemini(pesan_masuk)
        hasil_ai = json.loads(raw_response)
    except:
        hasil_ai = {"action": "chat", "reply": "Maaf, saya tidak mengerti maksud Anda."}

    # 2. Eksekusi Tindakan
    balasan = ""
    if hasil_ai.get('action') == 'check':
        resi = hasil_ai.get('resi')
        hasil_cek = cek_status_pengiriman(resi)
        
        if hasil_cek:
            balasan = hasil_cek
        else:
            balasan = f"❌ Maaf, No Resi *{resi}* tidak ditemukan di sistem."
    else:
        balasan = hasil_ai.get('reply')

    # 3. Kirim Balasan
    return jsonify({
        "reply": balasan
    }), 200

# ==========================================
# 5. FITUR DIARIUM: BMKG MULTI-PORT SCRAPER
# ==========================================
def diarium_scrape_bmkg():
    print("🌊 [DIARIUM] Memulai Cek Ombak 3 Pelabuhan Sekaligus...")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless") # Mode senyap aktif
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # DAFTAR PELABUHAN & KATA KUNCI PERAIRANNYA
    # Format: "ID_DATABASE": {"nama": "NAMA_TAMPILAN", "keywords": ["KATA_KUNCI_BMKG"]}
    target_ports = {
        "merak": {
            "nama": "Merak - Bakauheni",
            "keywords": ["Selat Sunda"]
        },
        "priok": {
            "nama": "Tanjung Priok (Teluk Jakarta)",
            "keywords": ["Teluk Jakarta", "Laut Jawa bagian barat"]
        },
        "ketapang": {
            "nama": "Ketapang - Gilimanuk",
            "keywords": ["Selat Bali"]
        }
    }

    try:
        driver.get("https://maritim.bmkg.go.id/cuaca/peringatan/gelombang")
        driver.implicitly_wait(15)
        
        # Ambil seluruh teks di halaman
        page_text = driver.find_element(By.TAG_NAME, "body").text
        
        # LOOPING: Cek satu per satu pelabuhan
        for port_id, data in target_ports.items():
            status = "Aman"
            wave = "0.5 - 1.25 m (Rendah)"
            is_danger = False
            
            # Cek apakah kata kunci perairan ini muncul di area "Gelombang Tinggi"?
            # (Logika sederhana: cari keyword di halaman)
            found_keyword = any(k in page_text for k in data['keywords'])
            
            if found_keyword:
                # Jika nama perairannya disebut, cek level bahayanya
                if "Gelombang Tinggi (2.50 - 4.0 m)" in page_text:
                    status = "Bahaya"
                    wave = "2.50 - 4.0 m (Tinggi)"
                    is_danger = True
                elif "Gelombang Sedang (1.25 - 2.50 m)" in page_text:
                    status = "Waspada"
                    wave = "1.25 - 2.50 m (Sedang)"
                    is_danger = True
            
            # Simpan ke Firebase (Dokumen terpisah tiap pelabuhan)
            doc_data = {
                "pelabuhan": data['nama'],
                "status": status,
                "waveHeight": wave,
                "isDanger": is_danger,
                "timestamp": datetime.datetime.now(),
                "lastCheck": datetime.datetime.now().strftime("%H:%M WIB")
            }
            db.collection('weather_alerts').document(port_id).set(doc_data)
            print(f"   ⚓ {data['nama']} -> {status}")

        print("✅ [DIARIUM] Semua pelabuhan berhasil dicek!")

    except Exception as e:
        print(f"❌ [DIARIUM] Error: {e}")
    finally:
        driver.quit()

# ... (Kode scheduler di bawah tetap sama) ...
# ==========================================
# 6. JALANKAN SCHEDULER & FLASK APP
# ==========================================
# Atur cron job: Jalan otomatis setiap jam 06:00 pagi WIB
scheduler = BackgroundScheduler()
scheduler.add_job(diarium_scrape_bmkg, 'interval', hours=1)
scheduler.start()

if __name__ == '__main__':
    # UNTUK TES SAAT INI (KITA PAKSA JALAN SEKALI SAAT SERVER NYALA)
    diarium_scrape_bmkg() 
    
    # Jalankan Server Utama
    app.run(port=5000, debug=True)
