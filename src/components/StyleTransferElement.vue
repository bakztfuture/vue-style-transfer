<template>
    <div>
        <canvas 
            ref="styleCanvas"
            width="400" 
            :aria-label="altText"
            role="img"
            >
        </canvas>
    </div>
</template>
<script>
import * as tf from '@tensorflow/tfjs';
tf.ENV.set('WEBGL_PACK', false);

export default {
    props: {
        originURL : String,
        styleURL : String,
        strength : {
            type: Number,
            default: 0.5
        },
        width : Number,
        loadingBackgroundColor: {
            type: String,
            default: '#E8E8E8'
        },
        loadingTextMessage : {
            type: String,
            default: "LOADING IMAGE"
        },
        loadingTextColor: {
            type: String,
            default: "#666666"
        },
        altText: String
    },
    data: function () {
        return {
            // images we will be using for the style transfer
            contentImg: null,
            styleImg: null,
            // final canvas element with style transfer output content
            stylized: null,
            // store our models
            styleNet: null,
            transformNet: null,
            // default "strength" of the style transfer
            styleRatio: this.strength
        }
    },
    name: "StyleTransferElement",
    methods: {
        // Load TensorFlow Model for transformer (151 KB)
        loadSeparableTransformerModel: async function() {
            let separableTransformNet = await tf.loadGraphModel(
                'https://raw.githubusercontent.com/reiinakano/arbitrary-image-stylization-tfjs/master/saved_model_transformer_js/model.json'
            );
            return(separableTransformNet);
        },
        // Load TensorFlow Model for movbileNetStyle (168 KB)
        loadMobileNetStyleModel: async function() {
            let mobileStyleNet = await tf.loadGraphModel(
                'https://raw.githubusercontent.com/reiinakano/arbitrary-image-stylization-tfjs/master/saved_model_style_js/model.json'
            );
            return(mobileStyleNet);
        },
        /**
         * Performs the actual style transfer and outputs it to the canvas element
         * Code below basically entirely taken from here:
         * https://github.com/reiinakano/arbitrary-image-stylization-tfjs/blob/5c93b212d7d3c7051a89a53667d2d5a61cd938b4/main.js
         */
        startStyling: async function() {
            this.stylized = this.$refs.styleCanvas;
            await tf.nextFrame();
            let bottleneck = await tf.tidy(() => { 
                return this.styleNet.predict(tf.browser.fromPixels(this.styleImg).toFloat().div(tf.scalar(255)).expandDims());
            })

            if (this.styleRatio !== 1.0) {
                await tf.nextFrame();
                const identityBottleneck = await tf.tidy(() => {
                    return this.styleNet.predict(tf.browser.fromPixels(this.contentImg).toFloat().div(tf.scalar(255)).expandDims());
                })
                const styleBottleneck = bottleneck;
                bottleneck = await tf.tidy(() => {
                    const styleBottleneckScaled = styleBottleneck.mul(tf.scalar(this.styleRatio));
                    const identityBottleneckScaled = identityBottleneck.mul(tf.scalar(1.0-this.styleRatio));
                    return styleBottleneckScaled.addStrict(identityBottleneckScaled)
                })
                styleBottleneck.dispose();
                identityBottleneck.dispose();
            }
            await tf.nextFrame();
            const stylized = await tf.tidy(() => {
                return this.transformNet.predict([tf.browser.fromPixels(this.contentImg).toFloat().div(tf.scalar(255)).expandDims(), bottleneck]).squeeze();
            })

            await tf.browser.toPixels(stylized, this.stylized);
            bottleneck.dispose();  // Might wanna keep this around
            stylized.dispose();
        }
    },
    mounted() {
        var canvas = this.$refs.styleCanvas;
        var ctx = canvas.getContext("2d");

        // Set background colour
        ctx.fillStyle = this.loadingBackgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set canvas "loading" text
        ctx.textBaseline = 'middle';
        ctx.textAlign = "center";
        ctx.fillStyle = this.loadingTextColor;
        ctx.font = "14px Arial";
        ctx.fillText(this.loadingTextMessage, canvas.width/2, canvas.height/2)

        /**
         * Chained promises below basically:
         * 1. Make sure the images are loaded completely from URL with cross origin in mind
         * 2. Make sure the models are loaded fully
         * 3. Starts the styling process and updates the states
         */
        let that = this;
        new Promise(function(resolve) {
            // Initialize images
            const img1 = new Image();
            img1.crossOrigin = "anonymous";
            img1.src = 'http://i.imgur.com/Jm3bQtu.jpg';
            img1.width = 400;
            img1.height = 400;
            that.contentImg = img1;

            const img2 = new Image();
            img2.crossOrigin = "anonymous";
            img2.src = 'http://i.imgur.com/osSv3S2.jpg';
            img2.width = 400;
            img2.height = 400;
            that.styleImg = img2;

            resolve(1);

        }).then(function() { // (**)
            // Grab tiny models from github and then start the style transfer
            Promise.all([
                that.loadMobileNetStyleModel(),
                that.loadSeparableTransformerModel(),
            ]).then(([styleNet, transformNet]) => {
                that.styleNet = styleNet;
                that.transformNet = transformNet;
                // Start the styling process
                that.startStyling();
            });
        });
    },
}
</script>
<style scoped>
</style>



