<template>
    <div>
        <h3>Hello out there!</h3>
        origin image:<br />
        <img src="http://i.imgur.com/Jm3bQtu.jpg" width="400" :id="componentId + '-originImage'" crossorigin='anonymous' />
        <br />
        style image:<br />
        <img src="http://i.imgur.com/osSv3S2.jpg" width="400" :id="componentId + '-styleImage'" crossorigin='anonymous' />
        <br />
        stylized image:<br />
        <canvas :id="componentId + '-styledImage'" width="400"></canvas>
    </div>
</template>
<script>
import * as tf from '@tensorflow/tfjs';

//import * as modelDataRaw from '../../src/tf_model/model.json';
//import * as tfn from '@tensorflow/tfjs-node';
//let modelData = tfn.io.fileSystem("../../public/tf_model/model.json");
//let modelData = tf.models.modelFromJSON(modelDataRaw2);

tf.ENV.set('WEBGL_PACK', false);

export default {
    data: function () {
        return {
            model : null,
            componentId: null,
            contentImg: null,
            styleImg: null,
            stylized: null,
            styleNet: null,
            transformNet: null,
            styleRatio: 0.3
        }
    },
    name: "StyleTransferElement",
    created() {
    },
    methods: {
        // Load TensorFlow Model
        loadSeparableTransformerModel: async function() {
            let separableTransformNet = await tf.loadGraphModel(
                'https://raw.githubusercontent.com/reiinakano/arbitrary-image-stylization-tfjs/master/saved_model_transformer_js/model.json'
            );
            return(separableTransformNet);
        },
        loadMobileNetStyleModel: async function() {
            let mobileStyleNet = await tf.loadGraphModel(
                'https://raw.githubusercontent.com/reiinakano/arbitrary-image-stylization-tfjs/master/saved_model_style_js/model.json'
            );
            return(mobileStyleNet);
        },
        /*        
        // Initialize images
        this.contentImg = document.getElementById(this.componentId + '-originImage');
        this.styleImg = document.getElementById(this.componentId + '-styleImage');
        this.stylized = document.getElementById(this.componentId + '-styledImage');
        */
        /*
        // Initialize images
        this.contentImgSlider = document.getElementById('content-img-size');
        this.connectImageAndSizeSlider(this.contentImg, this.contentImgSlider);
        this.styleImgSlider = document.getElementById('style-img-size');
        this.styleImgSquare = document.getElementById('style-img-square');
        this.connectImageAndSizeSlider(this.styleImg, this.styleImgSlider, this.styleImgSquare);
        
        this.styleRatio = 1.0
        this.styleRatioSlider = document.getElementById('stylized-img-ratio');
        this.styleRatioSlider.oninput = (evt) => {
        this.styleRatio = evt.target.value/100.;
        }

        // Initialize buttons
        this.styleButton = document.getElementById('style-button');
        this.styleButton.onclick = () => {
        this.disableStylizeButtons();
        this.startStyling().finally(() => {
            this.enableStylizeButtons();
        });
        };
        this.randomizeButton = document.getElementById('randomize');
        this.randomizeButton.onclick = () => {
        this.styleRatioSlider.value = getRndInteger(0, 100);
        this.contentImgSlider.value = getRndInteger(256, 400);
        this.styleImgSlider.value = getRndInteger(100, 400);
        this.styleRatioSlider.dispatchEvent(new Event("input"));
        this.contentImgSlider.dispatchEvent(new Event("input"));
        this.styleImgSlider.dispatchEvent(new Event("input"));
        if (getRndInteger(0, 1)) {
            this.styleImgSquare.click();
        }
        }

        // Initialize selectors
        this.contentSelect = document.getElementById('content-select');
        this.contentSelect.onchange = (evt) => this.setImage(this.contentImg, evt.target.value);
        this.contentSelect.onclick = () => this.contentSelect.value = '';
        this.styleSelect = document.getElementById('style-select');
        this.styleSelect.onchange = (evt) => this.setImage(this.styleImg, evt.target.value);
        this.styleSelect.onclick = () => this.styleSelect.value = '';
        */
        startStyling: async function() {
            this.stylized = document.getElementById(this.componentId + '-styledImage');
            await tf.nextFrame();
            let bottleneck = await tf.tidy(() => { 
                return this.styleNet.predict(tf.browser.fromPixels(this.styleImg).toFloat().div(tf.scalar(255)).expandDims());
            })
            console.log(bottleneck)

            if (this.styleRatio !== 1.0) {
                await tf.nextFrame();
                const identityBottleneck = await tf.tidy(() => {
                    return this.styleNet.predict(tf.browser.fromPixels(this.contentImg).toFloat().div(tf.scalar(255)).expandDims());
                })
                console.log(identityBottleneck);
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
            console.log(stylized)

            await tf.browser.toPixels(stylized, this.stylized);
            bottleneck.dispose();  // Might wanna keep this around
            stylized.dispose();
        }
    },
    mounted() {
        // Get the ID of this component, so we have unique IDS
        this.componentId = this._uid;

        document.querySelectorAll('img').forEach(image => {
            image.crossOrigin = 'Anonymous'; 
        });

        // Make sure the images are loaded before preceeding
        let that = this;
        new Promise(function(resolve) {
            // Initialize images
            that.contentImg = document.getElementById(that.componentId + '-originImage');
            const img1 = new Image();
            img1.crossOrigin = "anonymous";
            img1.src = 'http://i.imgur.com/Jm3bQtu.jpg';
            img1.width = 400;
            img1.height = 400;
            that.contentImg = img1;
            console.log(that.contentImg);

            that.styleImg = document.getElementById(that.componentId + '-styleImage');
            const img2 = new Image();
            img2.crossOrigin = "anonymous";
            img2.src = 'http://i.imgur.com/osSv3S2.jpg';
            img2.width = 400;
            img2.height = 400;
            that.styleImg = img2;

            resolve(1);

        }).then(function() { // (**)
            // Grab tiny model from github and then start the style transfer
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