document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    feather.replace();

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const loading = document.getElementById('loading');
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    const confidenceValue = document.getElementById('confidenceValue');
    const detectionsDiv = document.getElementById('detections');

    const detector = new ObjectDetector();
    let isRunning = false;

    // Initialize camera stream with mobile optimization
    async function setupCamera() {
        try {
            // Try to get the environment-facing camera first (back camera on phones)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 }, // Reduced for better performance
                    height: { ideal: 480 }
                },
                audio: false
            });
            video.srcObject = stream;

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    // Set canvas size to match video
                    const aspectRatio = video.videoWidth / video.videoHeight;
                    const maxWidth = Math.min(640, window.innerWidth - 40); // 40px for padding
                    canvas.width = maxWidth;
                    canvas.height = maxWidth / aspectRatio;
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error accessing camera:', error);
            throw new Error('Camera access denied or not available');
        }
    }

    // Draw detection boxes and labels with optimization
    function drawDetections(predictions) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scale factor for drawing on resized canvas
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        predictions.forEach(prediction => {
            // Scale the bounding box coordinates
            const scaledBox = [
                prediction.bbox[0] * scaleX,
                prediction.bbox[1] * scaleY,
                prediction.bbox[2] * scaleX,
                prediction.bbox[3] * scaleY
            ];

            // Draw bounding box
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(...scaledBox);

            // Draw label background
            const label = `${prediction.class} ${(prediction.score * 100).toFixed(1)}%`;
            ctx.font = '14px Arial';
            const textWidth = ctx.measureText(label).width;

            ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
            ctx.fillRect(
                scaledBox[0],
                scaledBox[1] - 20,
                textWidth + 6,
                20
            );

            // Draw label text
            ctx.fillStyle = '#000000';
            ctx.fillText(
                label,
                scaledBox[0] + 3,
                scaledBox[1] - 5
            );
        });

        // Update detections list with performance mode info
        const backend = detector.getBackend();
        detectionsDiv.innerHTML = `
            <div class="alert alert-info">
                Running in ${backend.toUpperCase()} mode for compatibility
            </div>
            <h3>Detected Objects</h3>
            ${predictions.map(pred => `
                <div class="detection-item">
                    ${pred.class}: ${(pred.score * 100).toFixed(1)}%
                </div>
            `).join('')}
        `;
    }

    // Optimized detection loop with performance monitoring
    async function detectFrame() {
        if (!isRunning) return;

        const startTime = performance.now();
        try {
            const predictions = await detector.detect(video);
            drawDetections(predictions);

            const endTime = performance.now();
            const fps = 1000 / (endTime - startTime);
            console.log(`Detection FPS: ${fps.toFixed(1)}`);

            requestAnimationFrame(detectFrame);
        } catch (error) {
            console.error('Detection error:', error);
            stopDetection();
            alert('Error during detection: ' + error.message);
        }
    }

    // Start detection with improved error handling
    async function startDetection() {
        if (isRunning) return;

        loading.style.display = 'block';
        loading.innerHTML = '<div class="spinner-border text-primary" role="status"></div><p>Starting camera...</p>';

        try {
            await setupCamera();
            isRunning = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            loading.style.display = 'none';
            detectFrame();
        } catch (error) {
            loading.style.display = 'none';
            alert('Error: ' + error.message);
        }
    }

    // Stop detection with cleanup
    function stopDetection() {
        isRunning = false;
        const stream = video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        video.srcObject = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        startBtn.disabled = false;
        stopBtn.disabled = true;
        detectionsDiv.innerHTML = '';
    }

    // Event listeners
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', stopDetection);

    confidenceThreshold.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        confidenceValue.textContent = value.toFixed(1);
        detector.setConfidenceThreshold(value);
    });

    // Initialize detector with better error handling
    (async function init() {
        loading.innerHTML = '<div class="spinner-border text-primary" role="status"></div><p>Loading ML model...</p>';
        try {
            await detector.initialize();
            loading.style.display = 'none';
            startBtn.disabled = false;
            const backend = detector.getBackend();
            detectionsDiv.innerHTML = `
                <div class="alert alert-success">
                    Ready to detect objects (running in ${backend.toUpperCase()} mode)
                </div>`;
        } catch (error) {
            loading.innerHTML = `
                <div class="alert alert-danger">
                    Error loading model. Please check your internet connection and try refreshing the page.
                    <br>Error: ${error.message}
                </div>`;
            console.error('Initialization error:', error);
        }
    })();
});