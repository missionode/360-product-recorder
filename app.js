// App State
const appState = {
    isCapturing: false,
    captureFrames: [],
    captureInterval: null,
    progress: 0,
    mediaStream: null,
    recentDemos: []
};

// DOM Elements
const createBtn = document.getElementById('createBtn');
const viewBtn = document.getElementById('viewBtn');
const uploadBtn = document.getElementById('uploadBtn');
const cameraModal = document.getElementById('cameraModal');
const uploadModal = document.getElementById('uploadModal');
const closeCamera = document.getElementById('closeCamera');
const closeUpload = document.getElementById('closeUpload');
const cameraFeed = document.getElementById('cameraFeed');
const startCapture = document.getElementById('startCapture');
const stopCapture = document.getElementById('stopCapture');
const captureFrame = document.getElementById('captureFrame');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const uploadProgressText = document.getElementById('uploadProgressText');
const uploadedFiles = document.getElementById('uploadedFiles');
const recentDemosSection = document.getElementById('recentDemos');
const demoGrid = document.getElementById('demoGrid');
const pwaStatus = document.getElementById('pwaStatus');

// Event Listeners
createBtn.addEventListener('click', openCamera);
viewBtn.addEventListener('click', viewDemos);
uploadBtn.addEventListener('click', openUploadModal);
closeCamera.addEventListener('click', closeCameraModal);
closeUpload.addEventListener('click', closeUploadModal);
startCapture.addEventListener('click', start360Capture);
stopCapture.addEventListener('click', stop360Capture);
captureFrame.addEventListener('click', captureSingleFrame);
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', handleDragOver);
uploadZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileUpload);

// Initialize PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
                pwaStatus.textContent = 'PWA Ready (Online)';
                pwaStatus.style.color = '#10b981';
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
                pwaStatus.textContent = 'PWA Limited (Check HTTPS)';
                pwaStatus.style.color = '#ef4444';
            });
    });
}

// Check online status
window.addEventListener('online', () => {
    pwaStatus.textContent = 'PWA Ready (Online)';
    pwaStatus.style.color = '#10b981';
});

window.addEventListener('offline', () => {
    pwaStatus.textContent = 'PWA Ready (Offline)';
    pwaStatus.style.color = '#f59e0b';
});

// Load recent demos from IndexedDB
loadRecentDemos();

// Camera Functions
async function openCamera() {
    cameraModal.style.display = 'flex';
    
    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment'
            }
        };
        
        appState.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraFeed.srcObject = appState.mediaStream;
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
    }
}

function closeCameraModal() {
    cameraModal.style.display = 'none';
    
    if (appState.mediaStream) {
        appState.mediaStream.getTracks().forEach(track => track.stop());
        appState.mediaStream = null;
    }
    
    if (appState.captureInterval) {
        clearInterval(appState.captureInterval);
        appState.captureInterval = null;
    }
    
    appState.isCapturing = false;
    stopCapture.classList.add('hidden');
    startCapture.classList.remove('hidden');
    progressSection.classList.add('hidden');
    resetProgress();
}

function start360Capture() {
    appState.isCapturing = true;
    appState.captureFrames = [];
    startCapture.classList.add('hidden');
    stopCapture.classList.remove('hidden');
    progressSection.classList.remove('hidden');
    
    // Auto-capture frames every 2 seconds
    appState.captureInterval = setInterval(captureAutoFrame, 2000);
    
    // Initial capture
    captureAutoFrame();
}

function stop360Capture() {
    appState.isCapturing = false;
    
    if (appState.captureInterval) {
        clearInterval(appState.captureInterval);
        appState.captureInterval = null;
    }
    
    // Generate 360 viewer
    if (appState.captureFrames.length > 0) {
        generate360Viewer();
    }
    
    stopCapture.classList.add('hidden');
    startCapture.classList.remove('hidden');
}

function captureSingleFrame() {
    if (!appState.isCapturing) {
        captureFrameToCanvas();
        updateProgress(5);
    }
}

function captureAutoFrame() {
    if (appState.isCapturing && appState.progress < 100) {
        captureFrameToCanvas();
        updateProgress(10);
    }
}

function captureFrameToCanvas() {
    const canvas = document.getElementById('captureCanvas');
    const context = canvas.getContext('2d');
    
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
    
    // Store frame data
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    appState.captureFrames.push({
        data: frameData,
        timestamp: Date.now(),
        index: appState.captureFrames.length
    });
    
    console.log(`Frame captured: ${appState.captureFrames.length}`);
}

function updateProgress(increment) {
    appState.progress = Math.min(appState.progress + increment, 100);
    progressFill.style.width = `${appState.progress}%`;
    progressText.textContent = `${appState.progress}%`;
    
    if (appState.progress >= 100) {
        stop360Capture();
    }
}

function resetProgress() {
    appState.progress = 0;
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
}

// 360 Viewer Generation
function generate360Viewer() {
    const demoId = `demo_${Date.now()}`;
    const demoData = {
        id: demoId,
        name: `Product Demo ${new Date().toLocaleDateString()}`,
        frames: appState.captureFrames,
        createdAt: new Date().toISOString(),
        type: '360'
    };
    
    // Save to IndexedDB
    saveDemo(demoData);
    
    // Create download link
    const jsonData = JSON.stringify(demoData);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${demoId}.json`;
    link.click();
    
    // Show success message
    alert('360° demo created successfully! File downloaded.');
    
    // Load 360 viewer page
    setTimeout(() => {
        window.open(`360-viewer.html?id=${demoId}`, '_blank');
    }, 1000);
}

// File Upload Functions
function openUploadModal() {
    uploadModal.style.display = 'flex';
}

function closeUploadModal() {
    uploadModal.style.display = 'none';
    uploadedFiles.innerHTML = '';
    uploadProgress.classList.add('hidden');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.style.borderColor = '#4f46e5';
    uploadZone.style.background = '#f8fafc';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.style.borderColor = '#cbd5e1';
    uploadZone.style.background = 'white';
    
    const files = e.dataTransfer.files;
    handleFiles(files);
}

function handleFileUpload(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    uploadProgress.classList.remove('hidden');
    uploadedFiles.innerHTML = '';
    
    let processed = 0;
    const total = files.length;
    
    Array.from(files).forEach((file, index) => {
        processFile(file, index, () => {
            processed++;
            const progress = Math.round((processed / total) * 100);
            uploadProgressFill.style.width = `${progress}%`;
            uploadProgressText.textContent = `${progress}%`;
            
            if (processed === total) {
                setTimeout(() => {
                    uploadProgress.classList.add('hidden');
                }, 1000);
            }
        });
    });
}

function processFile(file, index, callback) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        let icon = 'fa-file';
        let type = 'Unknown';
        
        if (file.type.startsWith('image/')) {
            icon = 'fa-image';
            type = 'Image';
        } else if (file.type.startsWith('video/')) {
            icon = 'fa-video';
            type = 'Video';
        } else if (file.name.endsWith('.json')) {
            icon = 'fa-cube';
            type = '360 Demo';
            
            // Parse and save JSON demo files
            try {
                const demoData = JSON.parse(e.target.result);
                demoData.id = `uploaded_${Date.now()}_${index}`;
                demoData.name = file.name.replace('.json', '');
                saveDemo(demoData);
            } catch (error) {
                console.error('Error parsing JSON:', error);
            }
        }
        
        fileItem.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="file-info">
                <h4>${file.name}</h4>
                <p>${type} • ${formatFileSize(file.size)}</p>
            </div>
        `;
        
        uploadedFiles.appendChild(fileItem);
        callback();
        
        // Refresh recent demos
        loadRecentDemos();
    };
    
    if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        // Handle video files
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// View Demos Functions
function viewDemos() {
    recentDemosSection.classList.remove('hidden');
    loadRecentDemos();
}

async function loadRecentDemos() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(['demos'], 'readonly');
        const store = transaction.objectStore('demos');
        const request = store.getAll();
        
        request.onsuccess = function(e) {
            const demos = e.target.result;
            appState.recentDemos = demos;
            
            if (demos.length > 0) {
                recentDemosSection.classList.remove('hidden');
                demoGrid.innerHTML = '';
                
                demos.slice(-6).reverse().forEach(demo => {
                    const demoItem = document.createElement('div');
                    demoItem.className = 'demo-item';
                    demoItem.onclick = () => openDemoViewer(demo.id);
                    
                    demoItem.innerHTML = `
                        <div class="demo-thumbnail">
                            <i class="fas fa-cube fa-3x"></i>
                        </div>
                        <h4>${demo.name}</h4>
                        <p>${new Date(demo.createdAt).toLocaleDateString()}</p>
                        <p>${demo.frames ? demo.frames.length : 0} frames</p>
                    `;
                    
                    demoGrid.appendChild(demoItem);
                });
            }
        };
    } catch (error) {
        console.error('Error loading demos:', error);
    }
}

function openDemoViewer(demoId) {
    window.open(`360-viewer.html?id=${demoId}`, '_blank');
}

// IndexedDB Functions
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('Product360DB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = function(e) {
            const db = e.target.result;
            
            if (!db.objectStoreNames.contains('demos')) {
                const store = db.createObjectStore('demos', { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

async function saveDemo(demoData) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(['demos'], 'readwrite');
        const store = transaction.objectStore('demos');
        store.put(demoData);
        
        // Refresh recent demos
        loadRecentDemos();
    } catch (error) {
        console.error('Error saving demo:', error);
    }
}