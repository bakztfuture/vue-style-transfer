<template>
    <div>
        <canvas 
            ref="styleCanvas"
            :width="width" 
            :height="height"
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
        originURL : {
            type: String,
            default: null
        },
        styleURL : {
            type: String,
            default: null
        },
        localOriginImage : {
            type: String,
            default: null
        },
        localStyleImage : {
            type: String,
            default: null
        },
        strength : {
            type: Number,
            default: 0.5
        },
        width : {
            Type: Number,
            default: 400
        },
        height : {
            Type: Number,
            default: 400
        },
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
        altText: {
            type: String,
            default: ''
        }
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
            // Initialize origin image
            if(that.originURL !== null){
                const img1 = new Image();
                img1.crossOrigin = "anonymous";
                img1.src = that.originURL;
                img1.width = that.width;
                img1.height = that.height;
                that.contentImg = img1;
            }else if(that.localOriginImage !== null){
                const img1 = new Image();
                img1.crossOrigin = "anonymous";
                img1.src = that.localOriginImage;
                img1.width = that.width;
                img1.height = that.height;
                that.contentImg = img1;
            }else{
                throw new TypeError("Please enter either a valid origin image URL or a local image file")
            }
            
            // Initialize style image
            if(that.styleURL !== null){
                const img2 = new Image();
                img2.crossOrigin = "anonymous";
                img2.src = that.styleURL;
                img2.width = that.width;
                img2.height = that.height;
                that.styleImg = img2;
            }else if(that.localStyleImage !== null){
                const img2 = new Image();
                img2.crossOrigin = "anonymous";
                img2.src = that.localStyleImage;
                img2.width = that.width;
                img2.height = that.height;
                that.styleImg = img2;
            }else{
                throw new TypeError("Please enter either a valid style image URL or a local image file")
            }

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



