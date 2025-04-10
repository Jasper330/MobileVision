class ObjectDetector {
    constructor() {
        this.model = null;
        this.isInitialized = false;
        this.confidenceThreshold = 0.6;
        this.backend = 'cpu'; // Default to CPU
    }

    async initialize() {
        try {
            // Force CPU backend to ensure compatibility
            await tf.setBackend('cpu');
            console.log('Using CPU backend for compatibility');
            this.backend = 'cpu';

            // Configure for mobile-optimized model
            const modelConfig = {
                base: 'lite_mobilenet_v2',
                modelUrl: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json'
            };

            // Load the model
            this.model = await cocoSsd.load(modelConfig);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Model initialization error:', error);
            throw new Error(`Failed to initialize model: ${error.message}`);
        }
    }

    async detect(video) {
        if (!this.isInitialized) {
            throw new Error('Detector not initialized');
        }

        try {
            const predictions = await this.model.detect(video);
            return predictions.filter(prediction => prediction.score >= this.confidenceThreshold);
        } catch (error) {
            console.error('Detection error:', error);
            throw new Error(`Detection failed: ${error.message}`);
        }
    }

    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = threshold;
    }

    getBackend() {
        return this.backend;
    }
}