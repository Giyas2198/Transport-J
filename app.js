// ==========================================
// 1. KONFIGURASI FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAQ9cA0_Emq_EioTTEEec8RDMhcBZqQwQc",
    authDomain: "vibrasi-50f4e.firebaseapp.com",
    projectId: "vibrasi-50f4e",
    storageBucket: "vibrasi-50f4e.firebasestorage.app",
    messagingSenderId: "886692239716",
    appId: "1:886692239716:web:25da3b7bfad5dafb3d8271"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth(); // TAMBAHAN PENTING

// ==========================================
// 2. VARIABEL GLOBAL
// ==========================================
let currentUser = null;          // User yang sedang login
let currentVendorName = null;    // Nama Vendor (jika user adalah vendor)
let globalVendorData = {}; 
let dashboardChart = null; 
let dashboardUnsubscribe = null;

// ==========================================
// 2.5. SISTEM LOGIN & AUTO-DETECT NAMA (UPDATED)
// ==========================================
// app.js

// ==========================================
// 2.5. SISTEM LOGIN & AUTO-DETECT NAMA (UPDATED)
// ==========================================
// ==========================================
// 2.5. SISTEM LOGIN & VISIBILITAS CHAT BOT
// ==========================================
// ==========================================
// 2.5. SISTEM LOGIN & VISIBILITAS CHAT BOT (REVISI FINAL)
// ==========================================
// app.js - Bagian Auth (Ganti Full Blok Ini)

// ==========================================
// 2.5. SISTEM LOGIN & LOGIKA ROLE (UPDATED)
// ==========================================
auth.onAuthStateChanged(async (user) => {
    // Referensi ke Widget Robot AI
    const aiWidget = document.getElementById('ai-widget-container');

    if (user) {
        try {
            // 1. Cek data user di Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (userDoc.exists) {
                let userData = userDoc.data();

                // [LOGIC VENDOR] Auto-Detect Nama dari Email jika belum ada
                if (userData.role === 'vendor' && !userData.vendorName) {
                    const autoName = user.email.split('@')[0].toUpperCase();
                    await db.collection('users').doc(user.uid).update({ vendorName: autoName });
                    userData.vendorName = autoName;
                }

                // Simpan User ke Global Variable
                currentUser = { ...user, ...userData };
                
                // Sembunyikan Login Form
                document.getElementById('section-login').classList.add('hidden');

                // === CEK ROLE ===
                if (userData.role === 'admin') {
                    // 🟢 JIKA ADMIN:
                    document.getElementById('section-admin').classList.remove('hidden');
                    
                  const aiWidget = document.getElementById('ai-widget-container');
    if(aiWidget) {
        console.log("🤖 ROBOT DIPAKSA MUNCUL!"); // Cek console nanti
        
        // 1. Hapus class hidden bawaan Tailwind (jika ada)
        aiWidget.classList.remove('hidden');

        // 2. Timpa Style CSS secara Brutal dengan !important
        aiWidget.style.cssText = `
            display: flex !important;
            position: fixed !important;
            bottom: 30px !important;
            right: 30px !important;
            z-index: 2147483647 !important; /* Z-Index Tertinggi */
            flex-direction: column !important;
            align-items: flex-end !important;
            gap: 15px !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        `;
    } else {
        console.error("❌ ERROR: Elemen 'ai-widget-container' tidak ketemu di HTML!");
    }

                    switchTab('dashboard'); 

                } else if (userData.role === 'vendor') {
                    // 🟠 JIKA VENDOR:
                    document.getElementById('section-vendor').classList.remove('hidden');
                    
                    // >> SEMBUNYIKAN ROBOT AI (PENTING) <<
                    if(aiWidget) aiWidget.classList.add('hidden');

                    // Set Nama Vendor
                    currentVendorName = userData.vendorName;
                    const vendorLabel = document.getElementById('vendor-name-display');
                    if(vendorLabel) vendorLabel.innerText = currentVendorName;
                    
                    // Load Data Vendor
                    switchVendorTab('v-dashboard');
                    listenForNewOrders();
                }

            } else {
                // User login di Firebase Auth tapi tidak ada di database Firestore
                Swal.fire({
                    title: 'Akses Ditolak',
                    text: 'Akun Anda belum terdaftar di database. Hubungi Administrator.',
                    icon: 'warning',
                    confirmButtonColor: '#d33'
                }).then(() => { auth.signOut(); });
            }

        } catch (e) {
            console.error("Error Auth:", e);
            Swal.fire('Error', 'Gagal memuat profil: ' + e.message, 'error');
            auth.signOut();
        }
    } else {
        // === STATE LOGOUT ===
        currentUser = null;
        currentVendorName = null;
        
        // Matikan listener realtime agar tidak memory leak
        if(dashboardUnsubscribe) dashboardUnsubscribe();
        if(vendorOrderUnsubscribe) vendorOrderUnsubscribe();
        
        // Reset Tampilan
        document.getElementById('section-login').classList.remove('hidden');
        document.getElementById('section-admin').classList.add('hidden');
        document.getElementById('section-vendor').classList.add('hidden');

        // >> SEMBUNYIKAN ROBOT SAAT LOGOUT <<
        if(aiWidget) aiWidget.classList.add('hidden');
    }
});
// PERBAIKAN 2: REAL-TIME ORDER LISTENER
// ==========================================
let vendorOrderUnsubscribe = null;

// Fungsi ini dipanggil sekali saat login untuk memantau notifikasi badge
function listenForNewOrders() {
    if (!currentVendorName) return;

    // Listener khusus untuk menghitung order baru (Status: scheduled)
    db.collection('delivery_planning')
        .where('vendor', '==', currentVendorName)
        .where('status', '==', 'scheduled')
        .onSnapshot((snapshot) => {
            const badge = document.getElementById('badge-order');
            if (!snapshot.empty) {
                badge.classList.remove('hidden'); // Munculkan badge "New"
                badge.innerText = snapshot.size;
                
                // Jika user sedang membuka tab order, refresh list-nya otomatis
                const orderView = document.getElementById('view-v-orders');
                if (!orderView.classList.contains('hidden')) {
                    renderVendorOrders(snapshot);
                }
            } else {
                badge.classList.add('hidden');
                // Jika list kosong dan user sedang melihat tab order
                const orderView = document.getElementById('view-v-orders');
                if (!orderView.classList.contains('hidden')) {
                    document.getElementById('vendor-orders-list').innerHTML = `<div class="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">Tidak ada order baru.</div>`;
                }
            }
        });
}

// Update fungsi loadVendorOrders agar menggunakan Real-time render
window.loadVendorOrders = function() {
    // Kita tidak perlu fetch ulang karena listenForNewOrders sudah menangani datanya,
    // tapi kita panggil manual sekali untuk memastikan tampilan ter-update saat klik tab.
    // Query snapshot ulang untuk render pertama kali klik tab
    const container = document.getElementById('vendor-orders-list');
    container.innerHTML = '<div class="text-center py-4"><i class="fa fa-circle-notch fa-spin text-emerald-500"></i> Sinkronisasi...</div>';

    db.collection('delivery_planning')
        .where('vendor', '==', currentVendorName)
        .where('status', '==', 'scheduled')
        .get()
        .then((snapshot) => {
            renderVendorOrders(snapshot);
        });
};

// Fungsi Render HTML Order (Dipisahkan agar bisa dipanggil berulang)
function renderVendorOrders(snapshot) {
    const container = document.getElementById('vendor-orders-list');
    
    if (snapshot.empty) {
        container.innerHTML = `<div class="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">Tidak ada order baru saat ini.</div>`;
        return;
    }

    let html = '';
    snapshot.forEach(doc => {
        const d = doc.data();
        // Format tanggal agar lebih mudah dibaca
        const dateStr = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru saja';

        html += `
            <div class="bg-white p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-600">${d.shipmentNo || '-'}</span>
                        <span class="text-[10px] text-slate-400"><i class="fa fa-calendar-alt"></i> ${dateStr}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <i class="fa fa-map-location-dot text-emerald-500"></i> ${d.destination}
                    </h3>
                    <p class="text-sm text-slate-500 mt-1"><i class="fa fa-user text-slate-300 mr-1"></i> Customer: <b>${d.customer}</b></p>
                </div>
                <button onclick="acceptOrder('${doc.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center gap-2 active:scale-95">
                    <i class="fa fa-truck-fast"></i> Ambil Order
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Ganti fungsi acceptOrder yang lama dengan ini
// ==========================================
// UPDATE: APP.JS - BAGIAN VENDOR (ACCEPT ORDER)
// ==========================================
// ==========================================
// UPDATE: APP.JS - BAGIAN VENDOR (ACCEPT ORDER)
// ==========================================

// Ganti seluruh fungsi acceptOrder yang lama dengan ini:

window.acceptOrder = async function(id) {
    try {
        // 1. Cek Driver & Ambil Data Driver
        const driversSnap = await db.collection('master_drivers')
            .where('vendor', '==', currentVendorName)
            .get();

        if (driversSnap.empty) {
            return Swal.fire({
                title: 'Driver Kosong',
                text: 'Anda belum mendaftarkan driver. Silakan ke menu "Input Driver" dulu.',
                icon: 'warning',
                confirmButtonColor: '#2563eb'
            });
        }

        // 2. Siapkan Pilihan Driver untuk Dropdown
        const driverOptions = {};
        driversSnap.forEach(doc => {
            const d = doc.data();
            driverOptions[doc.data().plate] = `${d.plate} - ${d.name} (${d.type})`;
        });

        // 3. Pop-up Pilih Armada
        const { value: selectedPlate } = await Swal.fire({
            title: 'Terbitkan Surat Jalan',
            text: "Pilih Armada yang akan jalan:",
            input: 'select',
            inputOptions: driverOptions,
            inputPlaceholder: '-- Pilih Armada --',
            showCancelButton: true,
            confirmButtonText: 'Generate 3 Tiket QR',
            confirmButtonColor: '#059669'
        });

        if (selectedPlate) {
            // Ambil nama driver untuk disimpan
            let driverName = 'Unknown';
            driversSnap.forEach(doc => { if(doc.data().plate === selectedPlate) driverName = doc.data().name; });

            // 4. Update Status di Database (Jadi Ready)
            await db.collection('delivery_planning').doc(id).update({ 
                status: 'ready_gate_in', 
                assignedPlate: selectedPlate, 
                assignedDriver: driverName,
                orderAcceptedTime: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 5. GENERATE 3 LINK QR CODE UNIK
            // Format Data: "AKSI|ID_DOKUMEN" -> Agar scanner admin tahu ini QR buat apa
            const apiQR = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=";
            
            const qr1 = `${apiQR}GATE_IN|${id}`;   // QR 1: Security Masuk
            const qr2 = `${apiQR}STUFFING|${id}`;  // QR 2: Gudang
            const qr3 = `${apiQR}GATE_OUT|${id}`;  // QR 3: Security Keluar

            // 6. TAMPILKAN 3 QR DALAM SATU POP-UP (HTML INJECTION)
            Swal.fire({
                title: '<i class="fa-solid fa-ticket"></i> TIKET JALAN DIGITAL',
                width: 850, // Pop-up dibuat lebar agar muat 3 QR
                html: `
                    <div class="text-left border-b pb-3 mb-4">
                        <h3 class="font-bold text-xl text-slate-800">${selectedPlate}</h3>
                        <p class="text-sm text-slate-500">Driver: <b>${driverName}</b> | Ref ID: ${id.substr(0,6)}</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 flex flex-col items-center">
                            <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3">1. MASUK (SECURITY)</span>
                            <img src="${qr1}" class="w-32 h-32 rounded-lg border bg-white p-1">
                            <p class="text-[10px] text-slate-500 mt-2 text-center">Scan saat tiba di gerbang depan</p>
                        </div>

                        <div class="bg-amber-50 p-4 rounded-xl border-2 border-amber-200 flex flex-col items-center">
                            <span class="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3">2. MUAT (GUDANG)</span>
                            <img src="${qr2}" class="w-32 h-32 rounded-lg border bg-white p-1">
                            <p class="text-[10px] text-slate-500 mt-2 text-center">Scan ke staff gudang sebelum muat</p>
                        </div>

                        <div class="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-200 flex flex-col items-center">
                            <span class="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3">3. KELUAR (JALAN)</span>
                            <img src="${qr3}" class="w-32 h-32 rounded-lg border bg-white p-1">
                            <p class="text-[10px] text-slate-500 mt-2 text-center">Scan saat akan meninggalkan pabrik</p>
                        </div>
                    </div>

                    <div class="mt-6 p-4 bg-slate-100 rounded-xl text-left border border-slate-200 flex gap-3 items-start">
                        <i class="fa fa-info-circle text-blue-500 mt-1"></i>
                        <div class="text-sm text-slate-600">
                            <b>Instruksi Driver:</b><br>
                            Screenshot layar ini dan kirim ke Driver via WhatsApp. Driver cukup menunjukkan QR Code yang sesuai di setiap pos pemeriksaan.
                        </div>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: 'Tutup & Refresh',
                confirmButtonColor: '#334155',
                allowOutsideClick: false
            }).then(() => {
                loadVendorOrders(); // Refresh halaman agar order hilang dari list "Baru"
            });
        }
    } catch (e) { 
        console.error(e);
        Swal.fire('Error', 'Gagal memproses order: ' + e.message, 'error'); 
    }
};
// ==========================================
// 3. NAVIGASI TAB (ADMIN & VENDOR)
// ==========================================

// Navigasi Admin (Update sedikit agar hanya ubah section admin)
window.switchTab = function(tabId) {
    if (dashboardUnsubscribe) { dashboardUnsubscribe(); dashboardUnsubscribe = null; }

    // Hide section di dalam container admin saja
    document.querySelectorAll('#section-admin .view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#section-admin .nav-links li').forEach(el => el.classList.remove('active', 'bg-white/10', 'text-white'));
    
    const target = document.getElementById(`view-${tabId}`);
    if(target) target.classList.remove('hidden');
    
    const navItem = document.getElementById(`nav-${tabId}`);
    if(navItem) navItem.classList.add('active', 'bg-white/10', 'text-white');

    // Load Data Admin
    if(tabId === 'dashboard') loadDashboardData();
    if(tabId === 'planning') loadPlanningData();
    if(tabId === 'master') loadMasterData();
    if(tabId === 'finance') loadFinanceData();
    if(tabId === 'drivers') loadDriversData(); // Nanti kita update isinya
    if(tabId === 'storage') loadStorageInfo();
    if(tabId === 'gps') loadGpsTracking();
    if(tabId === 'epod-center') loadAdminEpod();
    if(tabId === 'ops-control') loadOpsControl();
};

// Navigasi Vendor (BARU)
window.switchVendorTab = function(tabId) {
    document.querySelectorAll('#section-vendor .v-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#section-vendor .nav-links li').forEach(el => el.classList.remove('bg-white/10', 'text-white'));
    
    const target = document.getElementById(`view-${tabId}`);
    if(target) target.classList.remove('hidden');
    
    const navItem = document.getElementById(`nav-${tabId}`);
    if(navItem) navItem.classList.add('bg-white/10', 'text-white');

    // Load Data Vendor
    if(tabId === 'v-dashboard') loadVendorDashboard();
    if(tabId === 'v-orders') loadVendorOrders();
    if(tabId === 'v-drivers') loadVendorMyDrivers();
    if(tabId === 'v-epod') loadVendorEpod();
};

// ==========================================
// 4. MODULE: DASHBOARD (TAILWIND UI)
// ==========================================
window.loadDashboardData = function() {
    globalVendorData = {}; 
    const dashboardContainer = document.getElementById('view-dashboard');
    if (!dashboardContainer) return;

    // --- HTML DASHBOARD DENGAN CLASS TAILWIND ---
    dashboardContainer.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Performa</h2>
                    <p class="text-slate-500 text-sm">Real-time monitoring vendor logistics.</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="resetAllDashboardData()" class="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                        <i class="fa fa-trash"></i> Reset Data
                    </button>
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live
                    </div>
                </div>
            </div>
            
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-4">Komparasi Ritase</h3>
                <div class="h-64 w-full">
                    <canvas id="mainDashboardChart"></canvas>
                </div>
            </div>
            
            <div class="relative max-w-sm">
                <i class="fa fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="searchInput" onkeyup="filterVendor()" placeholder="Cari Vendor..." 
                       class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all text-sm">
            </div>
            
            <div id="vendorList" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div class="col-span-full text-center py-12 text-slate-400">
                    <i class="fa fa-circle-notch fa-spin text-3xl mb-3"></i>
                    <p>Memuat data...</p>
                </div>
            </div>
        </div>
    `;

    // --- LOGIC FIREBASE ---
    dashboardUnsubscribe = db.collection('vendor_kpi')
        .orderBy('timestamp', 'desc')
        .limit(800)
        .onSnapshot((snapshot) => {
            
            globalVendorData = {}; 
            const container = document.getElementById('vendorList');
            
            if (snapshot.empty) { 
                container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center p-10 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-400">
                    <i class="fa-solid fa-clipboard-list text-4xl mb-3 opacity-50"></i>
                    <p class="font-medium">Data Kosong</p>
                    <small class="text-xs">Selesaikan planning untuk mengisi data ini.</small>
                </div>`; 
                if (dashboardChart) dashboardChart.destroy();
                return; 
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const vendor = data.vendor || "Unknown";
                
                if (!globalVendorData[vendor]) {
                    globalVendorData[vendor] = { 
                        totalRitase: 0, 
                        totalScore: 0, 
                        count: 0, 
                        lastCustomer: data.customer || "-", 
                        details: [] 
                    };
                }
                
                globalVendorData[vendor].totalRitase += 1;
                globalVendorData[vendor].totalScore += (data.finalScore || 0);
                globalVendorData[vendor].count += 1;
                
                let dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : '-';
                globalVendorData[vendor].details.push({ 
                    customer: data.customer || "-", 
                    date: dateStr, 
                    score: data.finalScore || 0 
                });
            });

            const sortedVendors = Object.keys(globalVendorData).sort((a, b) => globalVendorData[b].totalRitase - globalVendorData[a].totalRitase);

            let html = '';
            sortedVendors.forEach((vendorName, index) => {
                const v = globalVendorData[vendorName];
                const avgScore = (v.totalScore / v.count).toFixed(1);
                const safeId = `miniChart-${vendorName.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;
                
                // Rank Badges & Color Logic
                let rankClass = index === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                                (index === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                                (index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-500 border-slate-100'));
                let rankLabel = `#${index + 1}`;
                
                let scoreColorClass = avgScore >= 80 ? 'text-emerald-600' : (avgScore >= 60 ? 'text-amber-500' : 'text-red-500');

                html += `
                    <div class="vendor-item bg-white p-5 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group" onclick="showRitaseDetail('${vendorName}')">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${rankClass}">${rankLabel}</span>
                                <h3 class="mt-1 text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">${vendorName}</h3>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-black ${scoreColorClass}">${avgScore}</div>
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avg Score</div>
                            </div>
                        </div>
                        
                        <div class="h-12 w-full mb-4">
                            <canvas id="${safeId}"></canvas>
                        </div>
                        
                        <div class="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center text-xs text-slate-600">
                             <span class="font-medium">Total: <b class="text-slate-900 text-sm">${v.totalRitase}</b> Rit</span>
                             <span class="truncate max-w-[120px] text-slate-400" title="Last: ${v.lastCustomer}">Last: ${v.lastCustomer}</span>
                        </div>
                    </div>`;
            });

            container.innerHTML = html;
            renderChart(sortedVendors);
            
            // Render Mini Charts
            setTimeout(() => {
                sortedVendors.forEach((name, idx) => {
                    const safeId = `miniChart-${name.replace(/[^a-zA-Z0-9]/g, '-')}-${idx}`;
                    const chartData = globalVendorData[name].details.slice(0, 15); 
                    renderMiniChart(safeId, chartData);
                });
            }, 300);

        });
};

// ... (renderChart dan renderMiniChart tetap sama secara logika ChartJS, tidak perlu diubah karena render ke Canvas) ...
function renderChart(sortedNames) {
    const ctx = document.getElementById('mainDashboardChart');
    if(!ctx) return;
    const top10 = sortedNames.slice(0, 10);
    if (dashboardChart) dashboardChart.destroy();

    dashboardChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: top10, 
            datasets: [{ 
                label: 'Total Ritase', 
                data: top10.map(n => globalVendorData[n].totalRitase), 
                borderColor: '#3b82f6', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6'
            }] 
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: {display:false} },
            scales: { 
                y: { grid: { color: '#f1f5f9' }, beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderMiniChart(canvasId, dataPoints) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const values = dataPoints.map(d => d.score).reverse(); 
    
    // Warna Line dinamis (Hijau jika skor terakhir bagus, merah jika jelek)
    const lastScore = values[values.length - 1];
    const lineColor = lastScore >= 70 ? '#10b981' : '#ef4444';

    new Chart(ctx, {
        type: 'line',
        data: { 
            labels: values.map((_, i) => i),
            datasets: [{ 
                data: values, borderColor: lineColor, borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4
            }] 
        },
        options: { 
            plugins: { legend: { display: false }, tooltip: { enabled: false } }, 
            scales: { x: { display: false }, y: { display: false, min: 40, max: 100 } }, 
            maintainAspectRatio: false, responsive: true
        }
    });
}

// Reset Dashboard
window.resetAllDashboardData = async function() {
    Swal.fire({
        title: 'Reset Dashboard?',
        text: "Data performa akan dihapus! Planning tetap aman.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Ya, Bersihkan!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const snapshot = await db.collection('vendor_kpi').get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            Swal.fire('Bersih!', 'Dashboard berhasil di-reset.', 'success');
        }
    });
}

// Filter Pencarian
window.filterVendor = function() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const items = document.getElementsByClassName('vendor-item');
    for (let item of items) {
        const name = item.querySelector('h3').innerText.toLowerCase();
        // Toggle class 'hidden' dari Tailwind untuk menyembunyikan
        if(name.includes(val)) item.classList.remove('hidden');
        else item.classList.add('hidden');
    }
};

window.showRitaseDetail = function(vendorName) {
    // ... Logika sama, hanya styling HTML SweetAlert yang perlu rapi
    const data = globalVendorData[vendorName];
    if(!data) return;

    let tableRows = '';
    data.details.slice(0, 50).forEach(d => {
        let colorClass = d.score >= 80 ? 'text-emerald-600' : (d.score >= 60 ? 'text-amber-600' : 'text-red-600');
        tableRows += `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="p-2 text-xs text-slate-500">${d.date}</td>
                <td class="p-2 text-xs font-medium text-slate-700">${d.customer}</td>
                <td class="p-2 text-xs font-bold text-right ${colorClass}">${d.score}</td>
            </tr>`;
    });

    Swal.fire({
        title: `<span class="text-slate-800 text-lg font-bold">${vendorName}</span>`,
        html: `
            <div class="bg-white p-1 rounded-lg border border-slate-100 mb-4">
                <div style="height: 180px; width: 100%;">
                    <canvas id="detailChart"></canvas>
                </div>
            </div>
            <div class="overflow-y-auto max-h-48 border border-slate-200 rounded-lg">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 sticky top-0">
                        <tr>
                            <th class="p-2 text-xs font-bold text-slate-500">TGL</th>
                            <th class="p-2 text-xs font-bold text-slate-500">CUST</th>
                            <th class="p-2 text-xs font-bold text-slate-500 text-right">SKOR</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `,
        width: 600,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            // ... Logic render chart sama persis ...
            const ctx = document.getElementById('detailChart');
            const chartData = [...data.details].reverse();
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.map(d => d.date),
                    datasets: [{
                        label: 'Skor',
                        data: chartData.map(d => d.score),
                        borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 2, tension: 0.3, fill: true, pointRadius: 3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
            });
        }
    });
};

// ==========================================
// 5. MODULE: PLANNING (TAILWIND STYLE)
// ==========================================
async function getOptionsHTML(collectionName) {
    let html = '<option value="" disabled selected>-- Pilih Data --</option>';
    try {
        const snapshot = await db.collection(collectionName).orderBy('name').get();
        snapshot.forEach(doc => { html += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
    } catch (e) { html += '<option value="">Gagal Load</option>'; }
    return html;
}

// ==========================================
// 5. MODULE: PLANNING (FIXED HTML INJECTION)
// ==========================================
window.loadPlanningData = async function() {
    const container = document.getElementById('view-planning');
    if (!container) return;

    // 1. INJECT KERANGKA HTML PLANNING (+ Tombol Refresh Baru)
    container.innerHTML = `
        <div class="flex flex-col h-full">
            <div class="flex justify-between items-center mb-6 px-2">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Delivery Planning</h2>
                    <p class="text-sm text-slate-500">Atur jadwal pengiriman dan alokasi vendor.</p>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="loadPlanningData()" class="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 font-bold text-sm" title="Refresh Data">
                        <i class="fa fa-sync-alt text-blue-500"></i>
                    </button>
                    
                    <button onclick="addNewOrder()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-transform active:scale-95 font-bold text-sm">
                        <i class="fa-solid fa-plus"></i> Buat Plan Baru
                    </button>
                </div>
            </div>

            <div class="kanban-board flex gap-4 overflow-x-auto pb-4 mb-6" style="min-height: 400px;">
                <div class="kanban-column flex-1 min-w-[300px] flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 backdrop-blur-sm">
                    <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white/40 rounded-t-xl">
                        <span class="font-bold text-slate-600 text-sm"><i class="fa fa-clock text-amber-500 mr-2"></i>Pending</span>
                        <span id="count-pending" class="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">0</span>
                    </div>
                    <div id="col-pending" class="kanban-body p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar"></div>
                </div>

                <div class="kanban-column flex-1 min-w-[300px] flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 backdrop-blur-sm">
                    <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white/40 rounded-t-xl">
                        <span class="font-bold text-slate-600 text-sm"><i class="fa fa-calendar-check text-blue-500 mr-2"></i>Scheduled</span>
                        <span id="count-scheduled" class="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">0</span>
                    </div>
                    <div id="col-scheduled" class="kanban-body p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar"></div>
                </div>

                <div class="kanban-column flex-1 min-w-[300px] flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 backdrop-blur-sm">
                    <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white/40 rounded-t-xl">
                        <span class="font-bold text-slate-600 text-sm"><i class="fa fa-truck-fast text-indigo-500 mr-2"></i>In Transit</span>
                        <span id="count-transit" class="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">0</span>
                    </div>
                    <div id="col-transit" class="kanban-body p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar"></div>
                </div>

                <div class="kanban-column flex-1 min-w-[300px] flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 backdrop-blur-sm">
                    <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-white/40 rounded-t-xl">
                        <span class="font-bold text-slate-600 text-sm"><i class="fa fa-check-circle text-emerald-500 mr-2"></i>Selesai</span>
                        <span id="count-done" class="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">0</span>
                    </div>
                    <div id="col-done" class="kanban-body p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar"></div>
                </div>
            </div>

            <div id="history-section-placeholder" class="mt-auto"></div>
        </div>
    `;

    // 2. INJECT TABEL HISTORY
    const historyPlaceholder = document.getElementById('history-section-placeholder');
    if (historyPlaceholder) {
        historyPlaceholder.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="text-slate-800 font-bold text-lg mb-4 flex items-center gap-2">
                    <i class="fa fa-clock-rotate-left text-slate-400"></i> History Selesai
                </h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase">
                                <th class="p-3 font-bold">Tanggal</th>
                                <th class="p-3 font-bold">No. Shipment</th>
                                <th class="p-3 font-bold">Customer</th>
                                <th class="p-3 font-bold">Tujuan</th>
                                <th class="p-3 font-bold">Armada</th> <th class="p-3 font-bold">Vendor</th>
                                <th class="p-3 font-bold">Score</th>
                                <th class="p-3 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="history-table-body" class="divide-y divide-slate-100 text-slate-600">
                            <tr><td colspan="8" class="p-4 text-center text-slate-400">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 3. LOAD DATA DARI FIREBASE
    try {
        // Set Loading Spinner
        ['pending', 'scheduled', 'transit', 'done'].forEach(id => {
            const el = document.getElementById(`col-${id}`);
            if(el) el.innerHTML = '<div class="text-center p-4 text-slate-400"><i class="fa fa-circle-notch fa-spin"></i></div>';
        });

        const snapshot = await db.collection('delivery_planning').orderBy('createdAt', 'desc').get();
        const cols = { pending: '', scheduled: '', transit: '', done: '' };
        const counts = { pending: 0, scheduled: 0, transit: 0, done: 0 };
        let historyRows = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const status = data.status || 'pending';
            const shipmentNo = data.shipmentNo || '-'; 
            
            // --- FITUR BARU: PLAT NOMOR ---
            let plateBadge = '';
            if (data.assignedPlate) {
                // Tampilan Plat Nomor Kuning agar mencolok
                plateBadge = `<span class="ml-2 text-[10px] bg-yellow-100 text-yellow-800 border border-yellow-200 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap"><i class="fa fa-truck text-[9px] mr-1"></i>${data.assignedPlate}</span>`;
            }

            // Logic Tombol
            let btnAction = '';
            if(status === 'pending') {
                btnAction = `<button class="text-[10px] bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 transition" onclick="moveStatus('${id}','scheduled')">Vendor <i class="fa fa-arrow-right ml-1"></i></button>`;
            } else if(status === 'scheduled') {
                btnAction = `<span class="text-[10px] text-slate-400 italic"><i class="fa fa-clock mr-1"></i> Menunggu Vendor</span>`;
            } else if(status === 'transit') {
                btnAction = `<button class="text-[10px] bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 px-2 py-1 rounded border border-slate-200 transition" onclick="moveStatus('${id}','done')">Selesai <i class="fa fa-check ml-1"></i></button>`;
            }

            // Template Card Kanban (Updated dengan Plat Nomor)
            const card = `
            <div class="kanban-card bg-white p-3 rounded-lg shadow-sm border border-slate-100 mb-3 hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-grab relative group" data-id="${id}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center flex-wrap gap-1">
                        <span class="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">${shipmentNo}</span>
                        ${plateBadge} </div>
                    <button onclick="deletePlan('${id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa fa-times"></i></button>
                </div>
                
                <h4 class="font-bold text-slate-800 text-sm mb-1 leading-tight">${data.customer}</h4>
                <p class="text-xs text-slate-500 mb-3 flex items-center gap-1"><i class="fa fa-location-dot text-[10px]"></i> ${data.destination}</p>
                
                <div class="pt-2 border-t border-dashed border-slate-100 flex justify-between items-center">
                    <span class="text-[10px] font-bold ${data.vendor ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400'} px-2 py-1 rounded border truncate max-w-[100px]">
                        ${data.vendor || 'No Vendor'}
                    </span>
                    ${btnAction}
                </div>
            </div>`;
            
            if(cols[status] !== undefined) { cols[status] += card; counts[status]++; }

            // Baris Tabel History (Khusus status done)
            if(status === 'done') {
                const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-';
                const scoreColor = (data.score || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
                
                historyRows += `
                    <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
                        <td class="p-3 text-slate-500 text-xs whitespace-nowrap">${date}</td>
                        <td class="p-3 text-slate-700 font-mono text-xs font-bold">${shipmentNo}</td>
                        <td class="p-3 font-medium text-slate-800 text-sm">${data.customer}</td>
                        <td class="p-3 text-slate-600 text-sm">${data.destination}</td>
                        <td class="p-3 text-slate-800 font-mono text-xs">${data.assignedPlate || '-'}</td> <td class="p-3 text-slate-600 text-sm">${data.vendor || '-'}</td>
                        <td class="p-3"><span class="${scoreColor} px-2 py-1 rounded-full text-[10px] font-bold">${data.score || 0}</span></td>
                        <td class="p-3 text-right"><button class="text-slate-400 hover:text-red-500 transition-colors" onclick="deletePlan('${id}')"><i class="fa fa-trash"></i></button></td>
                    </tr>
                `;              
            }
        });

        // Masukkan data ke HTML
        for (const [key, val] of Object.entries(cols)) {
            const colEl = document.getElementById(`col-${key}`);
            if(colEl) colEl.innerHTML = val || '<div class="text-center py-4 text-xs text-slate-300 italic">Kosong</div>';
            
            const countEl = document.getElementById(`count-${key}`);
            if(countEl) countEl.innerText = counts[key];
        }

        const historyBody = document.getElementById('history-table-body');
        if(historyBody) {
            historyBody.innerHTML = historyRows || '<tr><td colspan="8" class="p-6 text-center text-slate-400 italic">Belum ada pengiriman selesai.</td></tr>';
        }
        
        // Aktifkan Drag & Drop
        initKanbanBoard();

    } catch (e) { console.error(e); }
};

window.addNewOrder = async function() {
    const custOptions = await getOptionsHTML('master_customers');
    
    const { value: formValues } = await Swal.fire({
        title: 'Buat Plan Baru',
        html: `
            <div class="text-left space-y-3">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">No. Shipment</label>
                    <input id="swal-shipment" class="w-full p-2.5 border rounded-lg text-sm" placeholder="DN-2026-001">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Customer</label>
                    <select id="swal-cust" class="w-full p-2.5 border rounded-lg text-sm">${custOptions}</select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">No. WA PIC (62xxx)</label>
                    <input type="number" id="swal-wa" class="w-full p-2.5 border rounded-lg text-sm" placeholder="628123456789">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Tujuan</label>
                    <input id="swal-dest" class="w-full p-2.5 border rounded-lg text-sm" placeholder="Kota Tujuan">
                </div>
            </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
            return [
                document.getElementById('swal-shipment').value,
                document.getElementById('swal-cust').value,
                document.getElementById('swal-wa').value,
                document.getElementById('swal-dest').value
            ];
        }
    });
    
    if (formValues) {
        const [shipmentNo, customer, phone, destination] = formValues;

        if(!customer || !destination) {
            return Swal.fire('Gagal', 'Customer dan Tujuan wajib diisi!', 'error');
        }

        await db.collection('delivery_planning').add({ 
            shipmentNo: shipmentNo || "-", 
            customer: customer, 
            customerPhone: phone || "-", 
            destination: destination, 
            status: 'pending', 
            vendor: '', 
            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        
        Swal.fire('Sukses', 'Plan berhasil dibuat', 'success');
        loadPlanningData();
    }
};

window.moveStatus = async function(id, next) {
    if(next === 'scheduled') {
        const vOptions = await getOptionsHTML('master_vendors');
        const { value: vN } = await Swal.fire({ 
            title: 'Pilih Vendor', 
            html: `<select id="swal-v" class="w-full p-2 border border-slate-300 rounded outline-none">${vOptions}</select>`, 
            confirmButtonColor: '#2563eb',
            preConfirm: () => document.getElementById('swal-v').value 
        });
        if (vN) { await db.collection('delivery_planning').doc(id).update({ status: next, vendor: vN }); loadPlanningData(); }
    } else if(next === 'done') {
        const { value: sc } = await Swal.fire({ title: 'Beri Nilai (0-100)', input: 'number', confirmButtonColor: '#10b981' });
        if (sc) {
            const doc = await db.collection('delivery_planning').doc(id).get();
            const d = doc.data();
            await db.collection('delivery_planning').doc(id).update({ status: 'done', score: parseFloat(sc) });
            await db.collection('vendor_kpi').add({ 
                vendor: d.vendor, customer: d.customer, finalScore: parseFloat(sc), planningId: id, timestamp: firebase.firestore.FieldValue.serverTimestamp() 
            });
            loadPlanningData();
        }
    } else { 
        await db.collection('delivery_planning').doc(id).update({ status: next }); 
        loadPlanningData(); 
    }
};

window.initKanbanBoard = function() {
    ['col-scheduled', 'col-transit', 'col-done'].forEach(colId => {
        const el = document.getElementById(colId);
        if(el) {
            new Sortable(el, {
                group: 'kanban', 
                animation: 150,
                ghostClass: 'bg-blue-50', // Tailwind class
                onEnd: function (evt) {
                    const newStatus = evt.to.id.replace('col-', '');
                    const docId = evt.item.getAttribute('data-id');
                    updatePlanningStatus(docId, newStatus); 
                }
            });
        }
    });
};

async function updatePlanningStatus(docId, status) {
    try { await db.collection('delivery_planning').doc(docId).update({ status: status }); } catch(e) {}
}

// ==========================================
// 6. MODULE: MASTER DATA (TAILWIND FORM)
// ==========================================
window.loadMasterData = async function() {
    const masterContainer = document.getElementById('view-master');
    if (!masterContainer) return;

    masterContainer.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Master Data Management</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[600px] flex flex-col">
                    <h3 class="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Vendor Transport</h3>
                    
                    <div class="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 space-y-3">
                        <input type="text" id="inputVendorName" placeholder="Nama Vendor" class="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        <div class="flex gap-3">
                            <input type="number" id="inputVendorOncall" placeholder="Harga Oncall" class="w-1/2 p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                            <input type="number" id="inputVendorContract" placeholder="Harga Kontrak" class="w-1/2 p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <button onclick="addMasterVendor()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-500/20">
                            <i class="fa fa-plus"></i> Tambah Vendor
                        </button>
                    </div>

                    <ul id="listVendor" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        <li class="text-center text-slate-400 py-10">Loading...</li>
                    </ul>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[600px] flex flex-col">
                    <h3 class="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Customer / Toko</h3>
                    
                    <div class="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 space-y-3">
                        <input type="text" id="inputCustomerName" placeholder="Nama Customer" class="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                        <input type="text" id="inputCustomerArea" placeholder="Wilayah (Area)" class="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                        <button onclick="addMasterCustomer()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-emerald-500/20">
                            <i class="fa fa-plus"></i> Tambah Customer
                        </button>
                    </div>

                    <ul id="listCustomer" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        <li class="text-center text-slate-400 py-10">Loading...</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    refreshMasterList();
};

async function refreshMasterList() {
    const vList = document.getElementById('listVendor');
    const cList = document.getElementById('listCustomer');

    // Vendors
    const vSnap = await db.collection('master_vendors').orderBy('name').get();
    let vHtml = '';
    vSnap.forEach(doc => {
        const d = doc.data();
        vHtml += `
        <li class="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-200 transition-colors group">
            <div>
                <b class="text-slate-700 text-sm block">${d.name}</b>
                <div class="text-[10px] text-slate-500 mt-1 space-x-2">
                    <span class="bg-slate-100 px-1.5 py-0.5 rounded">OC: ${d.oncall?.toLocaleString()}</span>
                    <span class="bg-slate-100 px-1.5 py-0.5 rounded">CT: ${d.contract?.toLocaleString()}</span>
                </div>
            </div>
            <button class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" onclick="deleteMasterItem('master_vendors','${doc.id}')">
                <i class="fa fa-trash"></i>
            </button>
        </li>`;
    });
    if(vList) vList.innerHTML = vHtml || '<li class="text-center text-slate-400 p-4">Belum ada vendor.</li>';

    // Customers
    const cSnap = await db.collection('master_customers').orderBy('name').get();
    let cHtml = '';
    cSnap.forEach(doc => {
        const d = doc.data();
        cHtml += `
        <li class="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg hover:border-emerald-200 transition-colors group">
            <div>
                <b class="text-slate-700 text-sm block">${d.name}</b>
                <div class="text-[10px] text-slate-500 mt-1">
                    <span class="bg-slate-100 px-1.5 py-0.5 rounded"><i class="fa fa-map-marker-alt text-emerald-500"></i> ${d.area || '-'}</span>
                </div>
            </div>
            <button class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" onclick="deleteMasterItem('master_customers','${doc.id}')">
                <i class="fa fa-trash"></i>
            </button>
        </li>`;
    });
    if(cList) cList.innerHTML = cHtml || '<li class="text-center text-slate-400 p-4">Belum ada customer.</li>';
}

// ... Fungsi Add/Delete Master Data tetap sama (tidak perlu ubah logic) ...
window.addMasterVendor = async function() {
    const name = document.getElementById('inputVendorName').value;
    const oc = parseInt(document.getElementById('inputVendorOncall').value) || 0;
    const ct = parseInt(document.getElementById('inputVendorContract').value) || 0;
    if(!name) { Swal.fire('Error','Nama Vendor wajib diisi','error'); return; }
    await db.collection('master_vendors').add({ name, oncall: oc, contract: ct });
    refreshMasterList();
    document.getElementById('inputVendorName').value = '';
};

window.addMasterCustomer = async function() {
    const name = document.getElementById('inputCustomerName').value;
    const area = document.getElementById('inputCustomerArea').value;
    if(!name) { Swal.fire('Error','Nama Customer wajib diisi','error'); return; }
    await db.collection('master_customers').add({ name, area });
    refreshMasterList();
    document.getElementById('inputCustomerName').value = '';
};

window.deleteMasterItem = async function(coll, id) { 
    if(!confirm("Hapus data ini?")) return;
    await db.collection(coll).doc(id).delete(); 
    refreshMasterList(); 
};

window.deletePlan = async function(id) {
     const result = await Swal.fire({
        title: 'Hapus Plan?',
        text: "Data planning dan data di dashboard akan hilang.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    });
    if (!result.isConfirmed) return;
    try {
        const batch = db.batch();
        batch.delete(db.collection('delivery_planning').doc(id));
        const kpiSnapshot = await db.collection('vendor_kpi').where('planningId', '==', id).get();
        kpiSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        Swal.fire('Terhapus!', 'Data bersih.', 'success');
        loadPlanningData();
    } catch (e) { console.error(e); }
};

// ==========================================
// 7. MODULE: STORAGE INFO (TAILWIND)
// ==========================================
window.loadStorageInfo = async function() {
    const container = document.getElementById('view-storage');
    if(!container) return;

    // Loading State
    container.innerHTML = '<div class="text-center p-10"><i class="fa fa-circle-notch fa-spin text-slate-400 text-3xl"></i></div>';

    try {
        const planningSnap = await db.collection('delivery_planning').get();
        const kpiSnap = await db.collection('vendor_kpi').get();
        const totalDocs = planningSnap.size + kpiSnap.size;
        const limitEstimasi = 50000;
        const percentage = Math.min((totalDocs / limitEstimasi) * 100, 100).toFixed(1);
        
        let barColor = percentage > 80 ? 'bg-red-500' : 'bg-blue-500';

        container.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">System Health & Storage</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <i class="fa-solid fa-database"></i>
                        </div>
                        <h3 class="font-bold text-slate-700">Firestore Usage</h3>
                    </div>
                    
                    <div class="mb-2 flex justify-between text-sm">
                        <span class="text-slate-500">Dokumen Terpakai</span>
                        <span class="font-bold text-slate-800">${totalDocs} / ${limitEstimasi.toLocaleString()}</span>
                    </div>
                    
                    <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-4">
                        <div class="${barColor} h-3 rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
                    </div>
                    <p class="text-xs text-slate-400">Kuota Free Tier (Spark Plan) adalah 50k read/day.</p>
                </div>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                    <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
                        <i class="fa-solid fa-gauge-high text-xl"></i>
                    </div>
                    <h3 class="font-bold text-slate-800 mb-1">Google Cloud Console</h3>
                    <p class="text-sm text-slate-500 mb-4">Cek billing, security rules, dan usage detail.</p>
                    <a href="https://console.firebase.google.com/" target="_blank" class="text-sm font-bold text-amber-600 hover:text-amber-700 hover:underline">
                        Buka Console <i class="fa-solid fa-external-link-alt ml-1"></i>
                    </a>
                </div>
            </div>
        </div>`;
    } catch (e) {
        container.innerHTML = `<div class="p-10 text-center text-red-500">Gagal memuat info storage.</div>`;
    }
};

// ==========================================
// 8. MODULE: FINANCE ANALYSIS (FIXED HTML INJECTION)
// ==========================================
let financeChartInstance = null;

window.loadFinanceData = async function() {
    const container = document.getElementById('view-finance');
    if(!container) return;

    // 1. INJECT KERANGKA HTML FINANCE (Ini yang sebelumnya kurang)
    container.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-6">
            <div class="flex justify-between items-end">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Finance & Cost Control</h2>
                    <p class="text-sm text-slate-500">Analisis pengeluaran logistik berdasarkan status 'Done'.</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div class="text-xs font-bold text-slate-400 uppercase mb-1">Total Spending</div>
                    <div id="finance-total-grand" class="text-2xl font-black text-slate-800">Rp 0</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div class="text-xs font-bold text-slate-400 uppercase mb-1">Total Ritase</div>
                    <div id="finance-total-rit" class="text-2xl font-black text-blue-600">0 Rit</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div class="text-xs font-bold text-slate-400 uppercase mb-1">Avg Cost / Trip</div>
                    <div id="finance-avg-cost" class="text-2xl font-black text-emerald-600">Rp 0</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div class="text-xs font-bold text-slate-400 uppercase mb-1">Top Vendor</div>
                    <div id="finance-top-vendor" class="text-lg font-bold text-slate-700 truncate">...</div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <h3 class="font-bold text-slate-700 mb-4">Top 5 Spending Vendor</h3>
                    <div class="flex-1 relative" style="min-height: 250px;">
                        <canvas id="financeChart"></canvas>
                    </div>
                </div>

                <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-slate-100">
                         <h3 class="font-bold text-slate-700">Rincian Biaya per Vendor</h3>
                    </div>
                    <div class="overflow-y-auto flex-1">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0">
                                <tr>
                                    <th class="p-4">Nama Vendor</th>
                                    <th class="p-4 text-right">Ritase</th>
                                    <th class="p-4 text-right">Total Biaya</th>
                                </tr>
                            </thead>
                            <tbody id="finance-table-body" class="divide-y divide-slate-50 text-slate-700">
                                <tr><td colspan="3" class="text-center py-10 text-slate-400">Loading data...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. LOAD DATA (Logic sama seperti sebelumnya)
    const tableBody = document.getElementById('finance-table-body');
    const chartCanvas = document.getElementById('financeChart');
    
    try {
        // Ambil Data Master Vendor (untuk harga)
        const masterSnap = await db.collection('master_vendors').get();
        const priceMap = {}; 
        masterSnap.forEach(doc => {
            const d = doc.data();
            // Prioritas harga Contract, lalu Oncall
            priceMap[d.name] = (d.contract && d.contract > 0) ? d.contract : (d.oncall || 0);
        });

        // Ambil History Pengiriman 'DONE'
        const planSnap = await db.collection('delivery_planning').where('status', '==', 'done').get();
        
        const vendorStats = {};
        let grandTotal = 0;
        let totalRit = 0;

        planSnap.forEach(doc => {
            const d = doc.data();
            const vName = d.vendor || "Unknown";
            const price = priceMap[vName] || 0; 

            if (!vendorStats[vName]) { vendorStats[vName] = { rit: 0, total: 0 }; }

            vendorStats[vName].rit += 1;
            vendorStats[vName].total += price;
            
            grandTotal += price;
            totalRit += 1;
        });

        // Update Kartu Summary
        document.getElementById('finance-total-grand').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits:0 }).format(grandTotal);
        document.getElementById('finance-total-rit').innerText = totalRit + " Rit";
        
        const avgCost = totalRit > 0 ? (grandTotal / totalRit) : 0;
        document.getElementById('finance-avg-cost').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(avgCost);

        // Cari Top Vendor & Render Tabel
        let topVendor = "-";
        let maxSpend = -1;
        let tableHtml = "";
        const labels = [];
        const dataValues = [];

        // Urutkan Vendor dari pengeluaran terbesar
        const sortedVendors = Object.keys(vendorStats).sort((a,b) => vendorStats[b].total - vendorStats[a].total);

        sortedVendors.forEach(name => {
            const stat = vendorStats[name];
            if(stat.total > maxSpend) { maxSpend = stat.total; topVendor = name; }
            if(labels.length < 5) { labels.push(name); dataValues.push(stat.total); } // Top 5 Chart

            tableHtml += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-4 font-bold">${name}</td>
                    <td class="p-4 text-right font-mono">${stat.rit}</td>
                    <td class="p-4 text-right font-bold text-emerald-600 font-mono">
                        ${new Intl.NumberFormat('id-ID').format(stat.total)}
                    </td>
                </tr>
            `;
        });

        document.getElementById('finance-top-vendor').innerText = topVendor;
        tableBody.innerHTML = tableHtml || '<tr><td colspan="3" class="text-center py-10 text-slate-400">Belum ada data history selesai.</td></tr>';

        // Render Chart
        if(financeChartInstance) financeChartInstance.destroy();
        financeChartInstance = new Chart(chartCanvas, {
            type: 'doughnut', // Ganti ke Doughnut biar lebih cantik di box kecil
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 10} } } }
            }
        });

    } catch(e) {
        console.error(e);
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-400">Gagal memuat data.</td></tr>';
    }
};

// ==========================================
// 9. MODULE: DATA DRIVER (BARU)
// ==========================================
window.loadDriversData = function() {
    const container = document.getElementById('view-drivers');
    if(!container) return;

    // Render Tampilan Awal
    container.innerHTML = `
        <div class="max-w-5xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Database Driver</h2>
                    <p class="text-slate-500 text-sm">Kelola data supir dan kru kendaraan.</p>
                </div>
                <button onclick="alert('Fitur tambah coming soon!')" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-transform active:scale-95 font-medium text-sm">
                    <i class="fa-solid fa-plus"></i> Tambah Driver
                </button>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-10 text-center flex flex-col items-center justify-center text-slate-400">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-users-slash text-2xl text-slate-300"></i>
                    </div>
                    <h3 class="text-slate-800 font-bold text-lg">Belum ada data driver</h3>
                    <p class="text-sm max-w-xs mx-auto mt-1">Silakan tambahkan data driver baru untuk mulai memonitor kinerja kru.</p>
                </div>
            </div>
        </div>
    `;
    
    // Nanti di sini kita bisa tambahkan kode ambil data dari Firebase
    // db.collection('master_drivers').get()...
};
// ==========================================
// 10. MODUL KHUSUS VENDOR (BARU)
// ==========================================

// ==========================================
// A. VENDOR DASHBOARD (REAL-TIME UPDATE)
// ==========================================
window.loadVendorDashboard = async function() {
    const statsContainer = document.getElementById('v-stats-container');
    const chartCanvasScore = document.getElementById('vendorScoreChart');
    const chartCanvasStatus = document.getElementById('vendorStatusChart');

    if (!statsContainer) return;

    // 1. Tampilkan Loading State
    statsContainer.innerHTML = `
        <div class="col-span-4 text-center py-10">
            <i class="fa fa-circle-notch fa-spin text-emerald-500 text-2xl"></i>
            <p class="text-slate-400 mt-2">Mengambil data terbaru dari Admin...</p>
        </div>
    `;

    try {
        // 2. QUERY DATABASE: Ambil semua order milik vendor ini (Active & History)
        const snapshot = await db.collection('delivery_planning')
            .where('vendor', '==', currentVendorName) // Filter nama vendor (HURUF BESAR)
            .orderBy('createdAt', 'asc') // Urutkan dari yang terlama ke terbaru untuk grafik
            .get();

        // 3. OLAH DATA
        let totalOrder = 0;
        let countScheduled = 0; // Order Baru
        let countTransit = 0;   // Sedang Jalan
        let countDone = 0;      // Selesai
        let totalScore = 0;
        
        // Array untuk Grafik
        let labels = [];
        let scoreData = [];

        snapshot.forEach(doc => {
            const d = doc.data();
            totalOrder++;

            // Hitung Status
            if (d.status === 'scheduled') countScheduled++;
            if (d.status === 'transit') countTransit++;
            if (d.status === 'done') {
                countDone++;
                // Hanya order selesai yang punya nilai
                if (d.score !== undefined) {
                    totalScore += d.score;
                    // Masukkan ke data grafik tren
                    const dateLabel = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : '-';
                    labels.push(dateLabel); // Sumbu X: Tanggal
                    scoreData.push(d.score); // Sumbu Y: Nilai
                }
            }
        });

        // Hitung Rata-rata Skor
        const avgScore = countDone > 0 ? (totalScore / countDone).toFixed(1) : 0;

        // 4. RENDER KARTU STATISTIK (HTML INJECTION)
        statsContainer.innerHTML = `
            <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                <div>
                    <div class="text-2xl font-black text-slate-800">${totalOrder}</div>
                    <div class="text-xs font-bold text-slate-400 uppercase">Total Order</div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>
                <div>
                    <div class="text-2xl font-black text-slate-800">${countScheduled}</div>
                    <div class="text-xs font-bold text-slate-400 uppercase">Perlu Diambil</div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl">
                    <i class="fa-solid fa-truck-fast"></i>
                </div>
                <div>
                    <div class="text-2xl font-black text-slate-800">${countTransit}</div>
                    <div class="text-xs font-bold text-slate-400 uppercase">In Transit</div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
                    <i class="fa-solid fa-star"></i>
                </div>
                <div>
                    <div class="text-2xl font-black ${avgScore >= 80 ? 'text-emerald-600' : 'text-amber-500'}">${avgScore}</div>
                    <div class="text-xs font-bold text-slate-400 uppercase">Avg Score</div>
                </div>
            </div>
        `;

        // 5. RENDER GRAFIK 1: TREN SKOR (Line Chart)
        if (window.vendorScoreChartInstance) window.vendorScoreChartInstance.destroy(); // Hapus chart lama biar gak numpuk
        
        window.vendorScoreChartInstance = new Chart(chartCanvasScore, {
            type: 'line',
            data: {
                labels: labels, // Tanggal
                datasets: [{
                    label: 'Skor Pengiriman',
                    data: scoreData,
                    borderColor: '#2563eb', // Biru
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    tension: 0.4, // Garis melengkung
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        min: 0, max: 100,
                        grid: { borderDash: [2, 4] } 
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        // 6. RENDER GRAFIK 2: KOMPOSISI STATUS (Doughnut Chart)
        if (window.vendorStatusChartInstance) window.vendorStatusChartInstance.destroy();

        // Jika data kosong semua, kasih dummy biar grafik gak error
        const chartData = (countScheduled + countTransit + countDone) === 0 ? [1] : [countScheduled, countTransit, countDone];
        const chartColors = (countScheduled + countTransit + countDone) === 0 
            ? ['#e2e8f0'] // Abu-abu kalau kosong
            : ['#f59e0b', '#6366f1', '#10b981']; // Amber, Indigo, Emerald

        window.vendorStatusChartInstance = new Chart(chartCanvasStatus, {
            type: 'doughnut',
            data: {
                labels: ['Baru (Scheduled)', 'Jalan (Transit)', 'Selesai (Done)'],
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%', // Lubang tengah
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, font: {size: 11} } }
                }
            }
        });

    } catch (e) {
        console.error("Gagal load dashboard vendor:", e);
        statsContainer.innerHTML = `<div class="col-span-4 text-center text-red-500">Gagal memuat data: ${e.message}</div>`;
    }
};

// B. VENDOR GET ORDER (Ambil dari Planning Admin)
window.loadVendorOrders = async function() {
    const container = document.getElementById('vendor-orders-list');
    container.innerHTML = 'Loading orders...';

    // Cari order yang statusnya 'scheduled' DAN vendornya sesuai user login
    const snapshot = await db.collection('delivery_planning')
        .where('vendor', '==', currentVendorName)
        .where('status', '==', 'scheduled')
        .get();

    if (snapshot.empty) {
        container.innerHTML = `<div class="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">Tidak ada order baru.</div>`;
        return;
    }

    let html = '';
    snapshot.forEach(doc => {
        const d = doc.data();
        html += `
            <div class="bg-white p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold">${d.shipmentNo || '-'}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 text-lg">${d.destination}</h3>
                    <p class="text-sm text-slate-500">Cust: ${d.customer}</p>
                </div>
                <button onclick="acceptOrder('${doc.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all text-sm">
                    <i class="fa fa-truck-fast mr-2"></i> Jalan (Transit)
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
};

// ==========================================
// PERBAIKAN: APP.JS - FITUR 3 QR CODE (TIKET TERUSAN)
// ==========================================

window.submitDriver = async function() {
    const name = document.getElementById('v-driver-name').value;
    const phone = document.getElementById('v-driver-phone').value;
    const plate = document.getElementById('v-driver-plate').value;
    const type = document.getElementById('v-driver-type').value;

    if(!name || !plate) return Swal.fire('Error', 'Nama dan Nopol wajib diisi', 'error');

    // Animasi tombol loading (Opsional tapi bagus)
    const btn = document.querySelector('#view-v-drivers button');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        await db.collection('master_drivers').add({
            vendor: currentVendorName, 
            name, phone, plate, type,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire({
            title: 'Tersimpan!',
            text: 'Driver berhasil didaftarkan.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
        
        // Reset Form
        document.getElementById('v-driver-name').value = '';
        document.getElementById('v-driver-phone').value = '';
        document.getElementById('v-driver-plate').value = '';
        
        // Langsung refresh list di bawahnya
        loadVendorMyDrivers(); 

    } catch(e) {
        Swal.fire('Error', e.message, 'error');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
};

window.loadVendorMyDrivers = async function() {
    const list = document.getElementById('vendor-my-drivers');
    list.innerHTML = '<li class="text-center py-4"><i class="fa fa-circle-notch fa-spin text-emerald-500"></i> Loading...</li>';

    try {
        // PERBAIKAN: Hapus .orderBy('createdAt', 'desc') dulu agar tidak error Index
        const snap = await db.collection('master_drivers')
            .where('vendor', '==', currentVendorName)
            .get();

        let html = '';
        if (snap.empty) {
            html = '<li class="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">Belum ada driver yang didaftarkan.</li>';
        } else {
            snap.forEach(doc => {
                const d = doc.data();
                html += `
                    <li class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-emerald-300 transition-all">
                        <div>
                            <div class="font-bold text-slate-800 text-sm">${d.name}</div>
                            <div class="text-xs text-slate-500 mt-1">
                                <span class="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">${d.plate}</span>
                                <span class="ml-2 text-emerald-600 font-medium">${d.type || 'Truck'}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-slate-400 mb-1"><i class="fa fa-phone"></i> ${d.phone || '-'}</div>
                            <button onclick="deleteDriver('${doc.id}')" class="text-red-400 hover:text-red-600 text-xs"><i class="fa fa-trash"></i></button>
                        </div>
                    </li>`;
            });
        }
        list.innerHTML = html;
    } catch (e) {
        console.error(e);
        list.innerHTML = `<li class="text-center text-red-500 py-4">Gagal memuat: ${e.message}</li>`;
    }
};

// Tambahan fungsi hapus driver (Opsional, biar lengkap)
window.deleteDriver = async function(id) {
    if(confirm('Hapus driver ini?')) {
        await db.collection('master_drivers').doc(id).delete();
        loadVendorMyDrivers();
    }
};
// ==========================================
// 11. UPDATE ADMIN DRIVER VIEW (INTEGRASI)
// ==========================================
window.loadDriversData = async function() {
    const container = document.getElementById('view-drivers');
    
    // Render Tabel Admin
    container.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Database Driver (All Vendors)</h2>
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table class="w-full text-left border-collapse text-sm">
                    <thead class="bg-slate-50 border-b border-slate-200 uppercase text-xs font-bold text-slate-500">
                        <tr>
                            <th class="p-4">Nama Driver</th>
                            <th class="p-4">Vendor</th>
                            <th class="p-4">Kontak</th>
                            <th class="p-4">Armada</th>
                        </tr>
                    </thead>
                    <tbody id="admin-driver-tbody">
                        <tr><td colspan="4" class="p-6 text-center">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Ambil data dari koleksi master_drivers (hasil inputan vendor)
    const snap = await db.collection('master_drivers').orderBy('vendor').get();
    const tbody = document.getElementById('admin-driver-tbody');

    if(snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Belum ada data driver masuk.</td></tr>';
        return;
    }

    let html = '';
    snap.forEach(doc => {
        const d = doc.data();
        html += `
            <tr class="border-b border-slate-50 hover:bg-slate-50">
                <td class="p-4 font-bold text-slate-700">${d.name}</td>
                <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">${d.vendor}</span></td>
                <td class="p-4 text-slate-500">${d.phone || '-'}</td>
                <td class="p-4 font-mono">${d.plate} <span class="text-xs text-slate-400">(${d.type})</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

// Hapus window.onload lama, ganti dengan auth listener saja
// (Auth listener di Bagian 2 sudah otomatis handle load awal)

// ==========================================
// 12. FUNGSI AUTH (LOGIN & LOGOUT) - PENTING!
// ==========================================

// Fungsi Login yang dipanggil dari index.html
window.handleLogin = async function(event) {
    event.preventDefault(); // Mencegah reload halaman

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.querySelector('button[type="submit"]');

    if (!email || !password) {
        return Swal.fire('Gagal', 'Email dan Password wajib diisi!', 'warning');
    }

    // Ubah tombol jadi loading
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Memproses...';
    btn.disabled = true;

    try {
        // 1. Proses Login ke Firebase Auth
        await auth.signInWithEmailAndPassword(email, password);
        
        // (Listener onAuthStateChanged di atas akan otomatis jalan dan mengarahkan halaman)
        
        const Toast = Swal.mixin({
            toast: true, position: 'top', showConfirmButton: false, timer: 2000
        });
        Toast.fire({ icon: 'success', title: 'Login Berhasil!' });

    } catch (error) {
        console.error(error);
        let msg = "Email atau password salah.";
        if (error.code === 'auth/user-not-found') msg = "Akun tidak ditemukan.";
        if (error.code === 'auth/wrong-password') msg = "Password salah.";
        if (error.code === 'auth/too-many-requests') msg = "Terlalu banyak percobaan gagal. Coba nanti.";
        
        Swal.fire('Login Gagal', msg, 'error');
        
        // Kembalikan tombol
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// Fungsi Logout
window.logout = async function() {
    try {
        await auth.signOut();
        // Halaman akan otomatis kembali ke login karena listener onAuthStateChanged
    } catch (error) {
        console.error("Logout error", error);
    }
};

// ==========================================
// 7. MODULE: STORAGE INFO (TAILWIND)
// ==========================================
window.loadStorageInfo = async function() {
    const container = document.getElementById('view-storage');
    if(!container) return;

    // Loading State
    container.innerHTML = '<div class="text-center p-10"><i class="fa fa-circle-notch fa-spin text-slate-400 text-3xl"></i><p class="mt-4 text-slate-500">Menganalisis penggunaan database...</p></div>';

    try {
        // Hitung dokumen dari koleksi utama (Planning & KPI)
        // Kita tidak hitung Master Data karena biasanya sedikit
        const planningSnap = await db.collection('delivery_planning').get();
        const kpiSnap = await db.collection('vendor_kpi').get();
        
        const totalDocs = planningSnap.size + kpiSnap.size;
        
        // --- LOGIKA BATAS AMAN (QUOTA ESTIMATION) ---
        // Free Tier Firestore membatasi sekitar 50.000 read per hari.
        // Kita jadikan 50.000 sebagai "Soft Limit" visual agar admin waspada.
        const limitEstimasi = 50000;
        const percentage = Math.min((totalDocs / limitEstimasi) * 100, 100).toFixed(1);
        
        // Tentukan Warna Progress Bar
        let barColor = 'bg-emerald-500'; // Aman (Hijau)
        let statusText = 'Sistem Sehat';
        
        if (percentage > 50) { barColor = 'bg-amber-500'; statusText = 'Mulai Padat'; }
        if (percentage > 80) { barColor = 'bg-red-500'; statusText = 'Hampir Penuh (Warning)'; }

        container.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">System Health & Storage</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
                            <i class="fa-solid fa-database"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-lg">Firestore Documents</h3>
                            <p class="text-xs text-slate-500">Estimasi total transaksi tersimpan</p>
                        </div>
                    </div>
                    
                    <div class="mb-2 flex justify-between items-end">
                        <span class="text-3xl font-black text-slate-800">${totalDocs.toLocaleString()}</span>
                        <span class="text-sm font-bold text-slate-400">/ ${limitEstimasi.toLocaleString()} (Limit Harian)</span>
                    </div>
                    
                    <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-4">
                        <div class="${barColor} h-4 rounded-full transition-all duration-1000 relative" style="width: ${percentage}%">
                            <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center text-sm">
                        <span class="font-bold ${barColor.replace('bg-', 'text-')}">${statusText}</span>
                        <span class="text-slate-400">${percentage}% dari Kuota Harian</span>
                    </div>
                    
                    <div class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed">
                        <i class="fa fa-info-circle mr-1 text-blue-500"></i> 
                        <b>Catatan Admin:</b> Angka ini adalah jumlah dokumen transaksi (Order + KPI). 
                        Pada paket gratis (Spark), Google memberikan jatah <b>50.000 pembacaan/hari</b> dan total simpanan <b>1 GB</b>.
                    </div>
                </div>

                <div class="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden">
                    <i class="fa-brands fa-google absolute -right-6 -bottom-6 text-9xl text-white/5"></i>
                    
                    <div>
                        <div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-amber-400 text-xl mb-6 backdrop-blur-sm">
                            <i class="fa-solid fa-gauge-high"></i>
                        </div>
                        <h3 class="font-bold text-xl mb-2">Google Cloud Console</h3>
                        <p class="text-slate-300 text-sm leading-relaxed mb-6">
                            Untuk melihat data <b>Real-Time Billing</b>, penggunaan Bandwidth, dan sisa storage (MB/GB) yang 100% akurat, silakan cek langsung di panel resmi Google.
                        </p>
                    </div>
                    
                    <a href="https://console.firebase.google.com/" target="_blank" class="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/30 active:scale-95">
                        Buka Firebase Console <i class="fa-solid fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
        </div>`;

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="p-10 text-center text-red-500">Gagal memuat info storage: ${e.message}</div>`;
    }
};
// ==========================================
// 13. MODULE: GPS TRACKING & WEATHER (UPDATED)
// ==========================================
let mapInstance = null;
let truckMarkers = {}; 

// Data Dummy Truk (Lokasi Awal)
const activeTrucks = [
    { id: 'T-001', driver: 'Budi Santoso', vendor: 'MACAN LOGISTICS', lat: -6.200000, lng: 106.816666, dest: 'Bandung', shipment: 'DN-2601' },
    { id: 'T-002', driver: 'Agus Kotak', vendor: 'JAYA ABADI', lat: -6.300000, lng: 107.000000, dest: 'Cikarang', shipment: 'DN-2602' },
    { id: 'T-003', driver: 'Rian Jombang', vendor: 'TRANSINDO', lat: -6.595038, lng: 106.816635, dest: 'Bogor', shipment: 'DN-2603' },
    { id: 'T-004', driver: 'Siti Trucker', vendor: 'MACAN LOGISTICS', lat: -6.917464, lng: 107.619125, dest: 'Jakarta', shipment: 'DN-2604' }
];

window.loadGpsTracking = function() {
    const container = document.getElementById('view-gps');
    if (!container) return;

    // 1. Inisialisasi Peta
    if (!mapInstance) {
        mapInstance = L.map('map').setView([-6.5, 107.2], 9); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);
    }
    setTimeout(() => { mapInstance.invalidateSize(); }, 200);

    // 2. Mulai Simulasi
    startGpsSimulation();
};

// --- FITUR BARU: AMBIL CUACA DARI KOORDINAT ---
async function getWeatherInfo(lat, lng) {
    try {
        // Pakai Open-Meteo (Gratis, No API Key, Support Lat/Lng)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=Asia%2FBangkok`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Terjemahkan Kode Cuaca (WMO Code)
        const code = data.current_weather.weathercode;
        const temp = data.current_weather.temperature;
        
        let weatherDesc = "Cerah";
        let icon = "fa-sun text-yellow-500";
        
        // Logika WMO Code sederhana
        if (code >= 1 && code <= 3) { weatherDesc = "Berawan"; icon = "fa-cloud text-slate-400"; }
        if (code >= 45 && code <= 48) { weatherDesc = "Kabut"; icon = "fa-smog text-slate-300"; }
        if (code >= 51 && code <= 67) { weatherDesc = "Gerimis"; icon = "fa-cloud-rain text-blue-300"; }
        if (code >= 80 && code <= 99) { weatherDesc = "Hujan Deras/Badai"; icon = "fa-cloud-showers-heavy text-blue-600"; }

        return { temp, desc: weatherDesc, icon };
    } catch (e) {
        return { temp: "-", desc: "Data N/A", icon: "fa-question" };
    }
}

async function startGpsSimulation() {
    // Loop setiap truk untuk pasang marker & cek cuaca
    for (const truck of activeTrucks) {
        
        if (!truckMarkers[truck.id]) {
            // 1. Ambil Cuaca Dulu (Async)
            const weather = await getWeatherInfo(truck.lat, truck.lng);

            // 2. Icon Truk
            const customIcon = L.divIcon({
                html: `<div class="w-10 h-10 bg-blue-600 rounded-full border-2 border-white shadow-lg flex flex-col items-center justify-center text-white relative">
                        <i class="fa-solid fa-truck-fast text-xs"></i>
                        <span class="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm">
                            <i class="fa-solid ${weather.icon} text-[10px]"></i>
                        </span>
                       </div>`,
                className: 'bg-transparent',
                iconSize: [40, 40]
            });

            // 3. Pasang Marker
            const marker = L.marker([truck.lat, truck.lng], { icon: customIcon }).addTo(mapInstance);
            
            // 4. Popup Detail (Ada Cuaca & No DN)
            marker.bindPopup(`
                <div class="font-sans text-left min-w-[200px]">
                    <div class="flex justify-between items-start border-b pb-2 mb-2">
                        <div>
                            <b class="text-blue-600 block text-lg">${truck.id}</b>
                            <span class="text-[10px] bg-slate-100 px-1 rounded font-mono">${truck.shipment}</span>
                        </div>
                        <div class="text-center">
                            <i class="fa-solid ${weather.icon} text-xl block mb-1"></i>
                            <span class="text-xs font-bold">${weather.temp}°C</span>
                        </div>
                    </div>
                    
                    <div class="space-y-1 text-xs text-slate-600">
                        <div><i class="fa fa-user w-4"></i> ${truck.driver}</div>
                        <div><i class="fa fa-building w-4"></i> ${truck.vendor}</div>
                        <div><i class="fa fa-location-dot w-4 text-red-500"></i> Tujuan: <b>${truck.dest}</b></div>
                        <div class="mt-2 pt-2 border-t text-[10px] text-slate-400">
                            Cuaca Lokasi: <b>${weather.desc}</b>
                        </div>
                    </div>
                </div>
            `);
            
            truckMarkers[truck.id] = marker;
        }
    }

    // Update Posisi Simulasi (Tanpa refresh cuaca terus menerus biar hemat data)
    if (window.gpsInterval) clearInterval(window.gpsInterval);
    window.gpsInterval = setInterval(() => {
        updateTruckPositions();
    }, 2000);
}

function updateTruckPositions() {
    const sidebarList = document.getElementById('gps-sidebar-list');
    let listHtml = '';

    activeTrucks.forEach(truck => {
        // Simulasi Gerak Sedikit
        truck.lat += (Math.random() - 0.5) * 0.002;
        truck.lng += (Math.random() - 0.5) * 0.002;
        
        if (truckMarkers[truck.id]) {
            const newLatLng = new L.LatLng(truck.lat, truck.lng);
            truckMarkers[truck.id].setLatLng(newLatLng);
        }

        // List di Sidebar Kanan
        listHtml += `
            <li class="bg-slate-50 p-3 rounded-xl border border-slate-100 hover:bg-blue-50 cursor-pointer transition group" onclick="focusTruck('${truck.id}')">
                <div class="flex justify-between items-center mb-1">
                    <b class="text-slate-700 group-hover:text-blue-600">${truck.id}</b>
                    <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">${Math.floor(Math.random() * 20 + 60)} km/h</span>
                </div>
                <div class="text-xs text-slate-500 mb-1">${truck.shipment} • ${truck.dest}</div>
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                    <i class="fa fa-satellite-dish text-[8px]"></i> Update: Just now
                </div>
            </li>
        `;
    });

    if(sidebarList) sidebarList.innerHTML = listHtml;
}

window.focusTruck = function(id) {
    const truck = activeTrucks.find(t => t.id === id);
    if (truck && mapInstance) {
        mapInstance.flyTo([truck.lat, truck.lng], 13);
        truckMarkers[id].openPopup();
    }
};
// Navigasi switchVendorTab perlu diupdate untuk handle 'v-epod'
// ... (tambahkan if tabId === 'v-epod' loadVendorEpod()) ...

window.loadVendorEpod = async function() {
    const container = document.getElementById('view-v-epod');
    
    // 1. KITA PERBAIKI TAMPILAN HEADER DI SINI
    container.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <div class="mb-6 border-b border-slate-200 pb-4">
                <h2 class="text-2xl font-bold text-slate-800">Upload Bukti Pengiriman</h2>
                <p class="text-sm text-slate-500">Silakan unggah foto e-POD untuk order yang sedang berjalan (In Transit).</p>
            </div>
            
            <div id="epod-list" class="space-y-4 min-h-[300px]">
                <div class="text-center py-10 text-slate-400">
                    <i class="fa fa-circle-notch fa-spin text-2xl mb-2"></i><br>
                    Memuat data order...
                </div>
            </div>
        </div>
    `;
    
    // 2. LOGIC DATA (Hanya ambil yang status 'transit')
    try {
        const snapshot = await db.collection('delivery_planning')
            .where('vendor', '==', currentVendorName)
            .where('status', '==', 'transit') 
            .get();

        const list = document.getElementById('epod-list');
        
        if(snapshot.empty) {
            // Tampilan jika tidak ada order transit
            list.innerHTML = `
                <div class="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-truck text-2xl text-slate-300"></i>
                    </div>
                    <h3 class="text-slate-800 font-bold">Tidak ada pengiriman aktif</h3>
                    <p class="text-sm text-slate-500 max-w-xs mt-1">Anda hanya bisa upload bukti jika status order sudah "In Transit".</p>
                </div>
            `;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            html += `
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold tracking-wide">IN TRANSIT</span>
                                <span class="text-xs text-slate-400 font-mono">${d.shipmentNo || '#NOSHIP'}</span>
                            </div>
                            <h3 class="text-lg font-bold text-slate-800">${d.destination}</h3>
                            <p class="text-sm text-slate-500"><i class="fa fa-user mr-1"></i> ${d.customer}</p>
                        </div>
                    </div>
                    
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Pilih Foto Bukti (POD)</label>
                        <div class="flex gap-3">
                            <input type="file" id="file-${doc.id}" class="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2.5 file:px-4
                                file:rounded-xl file:border-0
                                file:text-sm file:font-semibold
                                file:bg-emerald-600 file:text-white
                                hover:file:bg-emerald-700 cursor-pointer"
                            />
                        </div>
                        <button onclick="submitEpod('${doc.id}')" class="mt-4 w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                            <i class="fa fa-paper-plane"></i> Kirim & Selesaikan Order
                        </button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;

    } catch (e) {
        console.error(e);
        document.getElementById('epod-list').innerHTML = `<div class="text-red-500 text-center">Error: ${e.message}</div>`;
    }
};

window.submitEpod = async function(docId) {
    const fileInput = document.getElementById(`file-${docId}`);
    
    if(fileInput.files.length === 0) {
        return Swal.fire('Error', 'Foto bukti wajib dipilih!', 'error');
    }

    // Ambil data order dulu untuk hitung durasi
    const docRef = db.collection('delivery_planning').doc(docId);
    const docSnap = await docRef.get();
    const data = docSnap.data();

    // === LOGIKA AUTO SCORE (KECEPATAN) ===
    // Anggap target pengiriman ideal adalah 24 jam (86400 detik)
    // Jika lebih cepat dari 24 jam = 100. Jika lambat, nilai turun.
    
    const startTime = data.orderAcceptedTime ? data.orderAcceptedTime.seconds : (Date.now() / 1000);
    const endTime = Date.now() / 1000; // Waktu sekarang (detik)
    const durationSeconds = endTime - startTime;
    const durationHours = (durationSeconds / 3600).toFixed(1);

    const TARGET_HOURS = 24; // Target KPI (Bisa disesuaikan)
    
    let autoScore = 100;
    if (durationHours > TARGET_HOURS) {
        // Rumus denda: Kurangi 5 poin setiap telat 1 jam
        const lateHours = durationHours - TARGET_HOURS;
        autoScore = Math.max(0, 100 - (lateHours * 5)); 
        autoScore = Math.round(autoScore);
    }

    const fakePhotoUrl = "https://placehold.co/600x400?text=POD+Score+"+autoScore; 

    // === UPDATE STATUS JADI 'DONE' LANGSUNG ===
    // Tidak lagi 'arrived', tapi langsung 'done' karena system yg menilai.
    await docRef.update({
        status: 'done', // AUTO FINISH
        podPhoto: fakePhotoUrl,
        podTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        score: autoScore, // AUTO SCORE
        actualDurationHours: durationHours
    });

    // Simpan juga ke KPI Vendor history
    await db.collection('vendor_kpi').add({ 
        vendor: data.vendor, 
        customer: data.customer, 
        finalScore: autoScore, 
        planningId: docId, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    });

    Swal.fire({
        title: 'Order Selesai!',
        html: `Terima kasih! Bukti terkirim.<br>
               Durasi: <b>${durationHours} Jam</b><br>
               System Score: <b class="text-emerald-600 text-xl">${autoScore}</b>`,
        icon: 'success'
    });
    
    loadVendorEpod(); 
};
// Navigasi switchTab perlu diupdate untuk handle 'epod-center'
// ... (tambahkan if tabId === 'epod-center' loadAdminEpod()) ...

window.loadAdminEpod = async function() {
    const container = document.getElementById('view-epod-center');
    
    // Reset HTML Container Admin
    container.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">e-POD Center</h2>
                    <p class="text-sm text-slate-500">Verifikasi bukti pengiriman yang masuk dari Vendor.</p>
                </div>
                <div class="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
                    Real-time Sync
                </div>
            </div>
            
            <div id="admin-epod-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="col-span-full text-center py-20 text-slate-400">
                    <i class="fa fa-circle-notch fa-spin text-3xl mb-3"></i><br>Mengecek data baru...
                </div>
            </div>
        </div>
    `;

    // Ambil data yang statusnya 'arrived' (Baru diupload vendor)
    const snapshot = await db.collection('delivery_planning')
        .where('status', '==', 'arrived') 
        .get();

    const list = document.getElementById('admin-epod-list');

    if(snapshot.empty) {
        list.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                <i class="fa-solid fa-check-double text-4xl mb-4 opacity-20"></i>
                <p class="font-medium">Semua Bersih!</p>
                <p class="text-sm">Tidak ada e-POD yang perlu diverifikasi saat ini.</p>
            </div>`;
        return;
    }

    let html = '';
    snapshot.forEach(doc => {
        const d = doc.data();
        const photo = d.podPhoto || 'https://via.placeholder.com/400?text=No+Image'; 
        
        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-lg transition-all">
                <div class="relative h-48 bg-slate-100 overflow-hidden">
                    <img src="${photo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onclick="window.open('${photo}')">
                        <span class="text-white font-bold text-sm bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/50"><i class="fa fa-eye"></i> Lihat Full</span>
                    </div>
                    <div class="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-wide">
                        Butuh Verifikasi
                    </div>
                </div>
                
                <div class="p-5 flex-1 flex flex-col">
                    <div class="mb-3">
                        <div class="text-xs text-slate-500 mb-1 flex justify-between">
                            <span>${d.vendor}</span>
                            <span class="font-mono font-bold text-slate-400">${d.shipmentNo}</span>
                        </div>
                        <h3 class="font-bold text-slate-800 text-lg leading-tight">${d.customer}</h3>
                        <p class="text-sm text-slate-500 mt-1 truncate">${d.destination}</p>
                    </div>
                    
                    <div class="mt-auto grid grid-cols-2 gap-2">
                        <a href="https://wa.me/${d.customerPhone}" target="_blank" class="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-xs transition">
                            <i class="fa-brands fa-whatsapp"></i> Kontak
                        </a>
                        <button onclick="verifyAndClose('${doc.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-500/20">
                            <i class="fa fa-check-circle"></i> Validasi
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
};

window.verifyAndClose = async function(docId) {
    // Pindahkan status ke 'done' (final)
    // Bisa tambahkan input score seperti sebelumnya jika mau
    await db.collection('delivery_planning').doc(docId).update({
        status: 'done'
    });
    
    // Simpan KPI Vendor otomatis (opsional)
    // ... logic KPI ...

    Swal.fire('Verified', 'Order ditutup (Done).', 'success');
    loadAdminEpod();
};
// ==========================================
// MODULE: OPS CONTROL (SCANNER & TRACKING)
// ==========================================
// ==========================================
// MODULE: OPS CONTROL (UI ADMIN)
// ==========================================
window.loadOpsControl = async function() {
    const container = document.getElementById('view-ops-control');
    if (!container) return;
    
    // 1. Render Tampilan Mobile-Friendly
    container.innerHTML = `
        <div class="flex flex-col h-full max-w-2xl mx-auto">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 text-center">
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Gate Control</h2>
                <p class="text-sm text-slate-500 mb-6">Gunakan kamera HP untuk scan QR Code Driver.</p>
                
                <button onclick="openScanner()" class="w-full bg-slate-800 hover:bg-black text-white p-6 rounded-2xl shadow-xl shadow-slate-300/50 flex items-center justify-center gap-4 transition-transform active:scale-95 group cursor-pointer">
                    <div class="bg-white/10 p-4 rounded-full group-hover:bg-white/20 transition">
                        <i class="fa-solid fa-qrcode text-3xl"></i>
                    </div>
                    <div class="text-left">
                        <span class="block text-xs text-slate-400 uppercase font-bold tracking-wider">Tap to Scan</span>
                        <span class="block text-xl font-bold">SCAN SURAT JALAN</span>
                    </div>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto pb-20 space-y-4">
                <div class="flex justify-between items-end px-2">
                    <h3 class="font-bold text-slate-700">Truk di Lokasi (Aktif)</h3>
                    <button onclick="loadOpsControl()" class="text-xs text-blue-600 font-bold hover:underline">
                        <i class="fa fa-sync"></i> Refresh
                    </button>
                </div>
                
                <div id="active-trucks-list" class="space-y-3 min-h-[200px]">
                    <div class="text-center py-10 text-slate-400">
                        <i class="fa fa-circle-notch fa-spin text-2xl mb-2"></i><br>Memuat data...
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        // 2. Ambil data truk yang statusnya 'gate_in' ATAU 'stuffing'
        const snapshot = await db.collection('delivery_planning')
            .where('status', 'in', ['gate_in', 'stuffing']) 
            .orderBy('gateInTime', 'desc') // Urutkan dari yang baru masuk
            .get();

        const list = document.getElementById('active-trucks-list');
        list.innerHTML = '';

        if(snapshot.empty) {
            list.innerHTML = `
                <div class="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                    <i class="fa-solid fa-truck-ramp-box text-3xl mb-3 opacity-30"></i>
                    <p class="text-sm">Tidak ada truk di dalam pabrik saat ini.</p>
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const d = doc.data();
            
            // Tentukan Badge Status & Warna
            let badgeHTML = '';
            let borderClass = '';
            
            if (d.status === 'gate_in') {
                badgeHTML = `<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-200"><i class="fa fa-clock mr-1"></i> MENUNGGU MUAT</span>`;
                borderClass = 'border-l-4 border-l-amber-400';
            } else {
                badgeHTML = `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-200"><i class="fa fa-box-open mr-1"></i> PROSES MUAT</span>`;
                borderClass = 'border-l-4 border-l-blue-500';
            }

            // Format Jam Masuk
            const timeString = d.gateInTime ? new Date(d.gateInTime.seconds * 1000).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '-';

            list.innerHTML += `
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center ${borderClass}">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="font-mono font-bold text-sm bg-slate-800 text-white px-2 py-0.5 rounded">${d.assignedPlate || '?'}</span>
                            ${badgeHTML}
                        </div>
                        <div class="text-sm font-bold text-slate-700">${d.vendor}</div>
                        <div class="text-xs text-slate-500 flex items-center gap-1">
                            <i class="fa fa-user text-[10px]"></i> ${d.customer}
                        </div>
                    </div>
                    <div class="text-right pl-2 border-l border-slate-100">
                        <div class="text-[10px] text-slate-400 uppercase font-bold">Gate In</div>
                        <div class="font-mono text-lg font-bold text-slate-700 leading-none mt-1">
                            ${timeString}
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error(e);
        document.getElementById('active-trucks-list').innerHTML = `<div class="text-center text-red-500 text-sm">Gagal memuat data.</div>`;
    }
};

// Helper Warna
function getStatusColor(status) {
    if(status === 'ready_gate_in') return 'bg-blue-500';
    if(status === 'gate_in') return 'bg-amber-500';
    if(status === 'stuffing') return 'bg-emerald-500';
    return 'bg-slate-300';
}

// FUNGSI SIMULASI SCANNER (KARENA KITA PAKAI WEB)
// Fungsi Scanner Simulator (Admin)
// Variable global untuk scanner agar bisa distop
// ==========================================
// UPDATE: APP.JS - BAGIAN ADMIN (SCANNER OTOMATIS)
// ==========================================

// Variable global scanner
// ==========================================
// MODULE: SMART SCANNER SYSTEM (CAMERA)
// ==========================================
let html5QrcodeScanner = null;

// A. FUNGSI MEMBUKA KAMERA
window.openScanner = function() {
    // Cek support browser
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return Swal.fire('Error Kamera', 'Browser ini tidak mendukung akses kamera. Pastikan menggunakan HTTPS atau localhost.', 'error');
    }

    Swal.fire({
        title: 'Scan QR Surat Jalan',
        html: `
            <div id="reader" style="width: 100%; border-radius: 12px; overflow: hidden; border: 2px solid #e2e8f0;"></div>
            <p class="text-xs text-slate-500 mt-3"><i class="fa fa-lightbulb text-amber-500"></i> Arahkan kamera ke QR Code Driver</p>
        `,
        showConfirmButton: false, 
        showCloseButton: true,
        width: 600,
        didOpen: () => {
            // Config Scanner
            html5QrcodeScanner = new Html5QrcodeScanner(
                "reader", 
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    disableFlip: false 
                },
                /* verbose= */ false
            );
            
            // Mulai Render Kamera
            html5QrcodeScanner.render(onScanSuccess, (errorMessage) => {
                // Error scanning frame biasa (ignore agar console bersih)
            });
        },
        willClose: () => {
            // MATIKAN KAMERA SAAT POPUP DITUTUP (PENTING!)
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(err => console.error("Gagal stop kamera", err));
            }
        }
    });
};

// B. LOGIKA SAAT QR BERHASIL DI-SCAN
async function onScanSuccess(decodedText, decodedResult) {
    // 1. Stop scanner & Tutup Popup
    if (html5QrcodeScanner) {
        await html5QrcodeScanner.clear();
        Swal.close();
    }

    // 2. Tampilkan Loading
    Swal.fire({
        title: 'Memproses QR...',
        html: 'Sedang memvalidasi data ke server...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        console.log("Hasil Scan:", decodedText);

        // 3. PARSING DATA QR (Format: AKSI|ID_DOKUMEN)
        // Contoh: GATE_IN|7dh38djs93
        const parts = decodedText.split('|');
        
        if (parts.length !== 2) {
            throw new Error("QR Code tidak valid! Pastikan scan QR resmi dari aplikasi.");
        }

        const action = parts[0].toUpperCase(); // GATE_IN, STUFFING, GATE_OUT
        const docId = parts[1];

        // 4. AMBIL DATA ORDER DARI DATABASE
        const docRef = db.collection('delivery_planning').doc(docId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new Error("Data Order tidak ditemukan di database.");
        }

        const data = docSnap.data();
        let updates = {};
        let successTitle = "";
        let successMsg = "";

        // 5. VALIDASI ALUR & LOGIKA STATUS
        // Mencegah loncat proses (misal: belum masuk kok sudah keluar)

        // --- SKENARIO 1: GATE IN (Security Depan) ---
        if (action === 'GATE_IN') {
            // Cek status saat ini
            if (data.status === 'gate_in') throw new Error("Truk ini SUDAH Check-In sebelumnya.");
            if (data.status === 'stuffing') throw new Error("Truk sedang proses muat (Sudah lewat Gate In).");
            if (data.status === 'transit') throw new Error("Truk sudah jalan (Sudah selesai).");
            
            // Status harus 'ready_gate_in' (Vendor sudah terima order)
            if (data.status !== 'ready_gate_in') {
                throw new Error("Status truk belum Ready. Hubungi Vendor untuk Accept Order.");
            }

            updates = { 
                status: 'gate_in', 
                gateInTime: firebase.firestore.FieldValue.serverTimestamp() 
            };
            successTitle = "GATE IN BERHASIL";
            successMsg = "Silakan arahkan truk ke Loading Dock.";
        }

        // --- SKENARIO 2: STUFFING (Staff Gudang) ---
        else if (action === 'STUFFING') {
            if (data.status === 'stuffing') throw new Error("Proses stuffing sedang berjalan.");
            if (data.status === 'transit') throw new Error("Truk sudah selesai muat dan jalan.");
            
            // Harus sudah Gate In
            if (data.status !== 'gate_in') {
                throw new Error("Truk belum scan Gate In di Security depan!");
            }

            updates = { 
                status: 'stuffing', 
                stuffingTime: firebase.firestore.FieldValue.serverTimestamp() 
            };
            successTitle = "MULAI MUAT (STUFFING)";
            successMsg = "Waktu mulai tercatat. Silakan proses muat barang.";
        }

        // --- SKENARIO 3: GATE OUT (Security Keluar) ---
        else if (action === 'GATE_OUT') {
            if (data.status === 'transit') throw new Error("Truk sudah tercatat keluar (Gate Out).");
            
            // Harus sudah Stuffing (atau Gate In minimal)
            if (data.status !== 'stuffing' && data.status !== 'gate_in') {
                throw new Error("Truk belum melakukan proses muat!");
            }

            updates = { 
                status: 'transit', // Status berubah jadi TRANSIT (OTW)
                gateOutTime: firebase.firestore.FieldValue.serverTimestamp() 
            };
            successTitle = "GATE OUT SUKSES";
            successMsg = "Truk status: IN TRANSIT. Hati-hati di jalan!";
        } 
        
        else {
            throw new Error("Tipe QR Code tidak dikenali: " + action);
        }

        // 6. UPDATE KE FIREBASE
        await docRef.update(updates);

        // 7. NOTIFIKASI SUKSES
        await Swal.fire({
            icon: 'success',
            title: successTitle,
            html: `
                <div class="text-center">
                    <div class="text-4xl mb-3">🚛</div>
                    <h3 class="font-bold text-xl text-slate-800">${data.assignedPlate || 'TRUK'}</h3>
                    <p class="text-sm text-slate-500 mt-2">${successMsg}</p>
                </div>
            `,
            timer: 3000,
            showConfirmButton: false
        });

        // 8. Refresh Halaman Admin (Ops Control)
        loadOpsControl();

    } catch (err) {
        // Handle Error
        Swal.fire({
            icon: 'error',
            title: 'Gagal Scan',
            text: err.message,
            confirmButtonText: 'Coba Lagi',
            confirmButtonColor: '#d33'
        }).then((result) => {
            // Jika user klik coba lagi, buka scanner
            if (result.isConfirmed) {
                openScanner();
            }
        });
    } 
    loadOpsControl(); // Refresh tampilan Admin
}
// ==========================================
// UPDATE: APP.JS - BAGIAN ADMIN (SCANNER OTOMATIS)
// ==========================================

// Variable global scanner

// 1. FUNGSI MEMBUKA KAMERA
window.openScanner = function() {
    Swal.fire({
        title: 'Scan QR Code Driver',
        html: `
            <div id="reader" style="width: 100%; min-height: 250px;"></div>
            <p class="text-xs text-slate-500 mt-2">Arahkan kamera ke salah satu QR Code Driver</p>
        `,
        showConfirmButton: false, 
        showCloseButton: true,
        width: 600,
        willOpen: () => {
            // Inisialisasi Library HTML5-QRCode
            html5QrcodeScanner = new Html5QrcodeScanner(
                "reader", 
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );
            // Render Kamera
            html5QrcodeScanner.render(onScanSuccess, (error) => { /* ignore errors */ });
        },
        willClose: () => {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear();
            }
        }
    });
};

// 2. LOGIKA KETIKA QR BERHASIL DI-SCAN
async function onScanSuccess(decodedText, decodedResult) {
    // Stop scanning sebentar agar tidak double scan
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        Swal.close(); // Tutup popup kamera
    }

    // Tampilkan Loading
    Swal.fire({ title: 'Memproses QR...', didOpen: () => Swal.showLoading() });

    try {
        // DECODE FORMAT: "AKSI|DOC_ID"
        // Contoh: "GATE_IN|7dh38djs93"
        const parts = decodedText.split('|');
        
        if (parts.length !== 2) {
            throw new Error("Format QR Code tidak valid!");
        }

        const action = parts[0]; // GATE_IN, STUFFING, atau GATE_OUT
        const docId = parts[1];  // ID Dokumen Firebase

        // Ambil Data Order dari Firebase
        const docRef = db.collection('delivery_planning').doc(docId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) throw new Error("Data Order tidak ditemukan.");
        
        const d = docSnap.data();
        let updates = {};
        let successMessage = '';

        // --- VALIDASI ALUR (MENCEGAH LONCAT PROSES) ---

        // SKENARIO 1: SCAN QR GATE IN
        if (action === 'GATE_IN') {
            if (d.status === 'gate_in') throw new Error("Truk ini SUDAH check-in sebelumnya.");
            if (d.status !== 'ready_gate_in') throw new Error("Truk belum status 'Ready'. Hubungi Vendor.");
            
            updates = { 
                status: 'gate_in', 
                gateInTime: firebase.firestore.FieldValue.serverTimestamp() 
            };
            successMessage = `Gate In Berhasil!<br>Silakan masuk ke Loading Dock.`;
        }

        // SKENARIO 2: SCAN QR STUFFING (GUDANG)
        else if (action === 'STUFFING') {
            if (d.status === 'stuffing') throw new Error("Sedang proses stuffing.");
            if (d.status !== 'gate_in') throw new Error("Truk belum Gate In! Harap scan di Security dulu.");
            
            updates = { 
                status: 'stuffing', 
                stuffingTime: firebase.firestore.FieldValue.serverTimestamp() 
            };
            successMessage = `Status Update: STUFFING.<br>Mulai proses muat barang.`;
        }

        // SKENARIO 3: SCAN QR GATE OUT (KELUAR)
        else if (action === 'GATE_OUT') {
            if (d.status === 'transit') throw new Error("Truk sudah jalan (Gate Out).");
            if (d.status !== 'stuffing') throw new Error("Proses muat belum selesai/dimulai.");
            
            updates = { 
                status: 'transit', // Status berubah jadi TRANSIT (OTW)
                gateOutTime: firebase.firestore.FieldValue.serverTimestamp() 
            };
            successMessage = `Gate Out Berhasil!<br>Truk status: <b>IN TRANSIT</b>`;
        } 
        
        else {
            throw new Error("QR Code tidak dikenali oleh sistem ini.");
        }

        // --- EKSEKUSI UPDATE DATABASE ---
        await docRef.update(updates);

        // Notifikasi Sukses
        await Swal.fire({
            icon: 'success',
            title: 'Scan Sukses!',
            html: `<b>${d.assignedPlate}</b><br>${successMessage}`,
            timer: 3000,
            showConfirmButton: false
        });

        // Refresh Halaman Ops Control Admin
        loadOpsControl();

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Scan Gagal',
            text: err.message,
            confirmButtonText: 'Coba Lagi'
        }).then(() => {
            // Buka scanner lagi jika gagal (opsional)
            openScanner();
        });
    }
}
// ==========================================
// 14. INTEGRASI AI CHAT (FRONTEND to PYTHON)
// ==========================================

// Fungsi Toggle (Buka/Tutup Chat)
// app.js

window.toggleAiChat = function() {
    const box = document.getElementById('ai-chat-box');
    
    // Cek apakah sedang tertutup (display none atau kosong)
    if (box.style.display === 'none' || box.style.display === '') {
        // BUKA
        box.style.display = 'flex';
        // Delay sedikit agar transisi CSS opacity jalan
        setTimeout(() => {
            box.style.opacity = '1';
            box.style.transform = 'scale(1)';
        }, 10);
        
        // Fokus ke input otomatis
        setTimeout(() => document.getElementById('ai-input').focus(), 100);
        
    } else {
        // TUTUP
        box.style.opacity = '0';
        box.style.transform = 'scale(0.9)';
        setTimeout(() => {
            box.style.display = 'none';
        }, 200); // Tunggu animasi selesai baru hilangkan
    }
};
// Event Listener buat tombol Enter
document.getElementById('ai-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendAiMessage();
});

// Fungsi Kirim Pesan
async function sendAiMessage() {
    const input = document.getElementById('ai-input');
    const msgArea = document.getElementById('ai-messages');
    const message = input.value.trim();

    if (!message) return;

    // 1. Tampilkan Pesan Kita (User)
    msgArea.innerHTML += `
        <div class="flex justify-end animate-fade-in">
            <div class="bg-blue-600 text-white p-3 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-md max-w-[85%]">
                ${message}
            </div>
        </div>
    `;
    input.value = '';
    msgArea.scrollTop = msgArea.scrollHeight; // Auto scroll ke bawah

    // 2. Tampilkan Loading Bubble
    const loadingId = 'loading-' + Date.now();
    msgArea.innerHTML += `
        <div id="${loadingId}" class="flex justify-start animate-fade-in">
            <div class="bg-white border border-slate-200 text-slate-500 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm italic text-xs">
                <i class="fa fa-circle-notch fa-spin mr-1"></i> Mengetik...
            </div>
        </div>
    `;
    msgArea.scrollTop = msgArea.scrollHeight;

    try {
        // 3. PANGGIL PYTHON (Backend Localhost)
        const response = await fetch('http://127.0.0.1:5000/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: message, 
                sender: "Admin Web" // Biar Python tau ini dari Web
            })
        });

        const data = await response.json();

        // 4. Hapus Loading & Tampilkan Jawaban AI
        document.getElementById(loadingId).remove();
        
        // Format Text (Ganti \n jadi <br>)
        const replyFormatted = data.reply.replace(/\n/g, '<br>');

        msgArea.innerHTML += `
            <div class="flex justify-start animate-fade-in">
                <div class="bg-white border border-slate-200 text-slate-700 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm max-w-[85%]">
                    ${replyFormatted}
                </div>
            </div>
        `;

    } catch (error) {
        document.getElementById(loadingId).remove();
        msgArea.innerHTML += `
            <div class="flex justify-start">
                <div class="bg-red-50 text-red-600 border border-red-200 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl text-xs">
                    Error: Python server belum nyala bos! (Cek Terminal)
                </div>
            </div>
        `;
    }
    msgArea.scrollTop = msgArea.scrollHeight;
}
