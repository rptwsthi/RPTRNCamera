import React, { Component } from 'react';
import { StyleSheet,Dimensions, Text, TouchableOpacity, View, Image, Alert, Platform} from 'react-native';
import { RNCamera } from 'react-native-camera';

//..
// import { screenWidth, uuidv4 } from '../config/helpers';
// import { strings } from '../../locales/i18n';
import Toast from 'react-native-simple-toast';
// import Permissions from 'react-native-permissions'
import {PERMISSIONS, checkMultiple, request, requestMultiple, RESULTS, openSettings} from 'react-native-permissions';
//..
import RNFetchBlob from 'rn-fetch-blob';
import RNCompress from 'react-native-compress';
import Marker from "react-native-image-marker"
import ImageResizer from 'react-native-image-resizer';
import {default as _imagePicker} from 'react-native-image-picker';
// var _imagePicker = require('react-native-image-picker');
import ImagePicker from 'react-native-image-crop-picker';
import Spinner from 'react-native-loading-spinner-overlay';
// import {isIphoneX} from '../config/helpers';
import _ from "lodash";

// import ImagePicker from 'react-native-image-crop-picker';

import * as Progress from 'react-native-progress';

// const PendingView = () => (
//   <View
//     style={{
//       backgroundColor: 'lightgreen',
//       justifyContent: 'center',
//       alignItems: 'center',
//     }}
//   >
//     <Text>{strings('miscellaneous.wait')}</Text>
//   </View>
// );

const _global = require('./global');

const kMSVideoStartDelay = 500;
const kMSTimeInterval = 500;
var captureComplete = false;
/**
 * onlyImage: if true this prop will restrict capture to only image
 */
var ref;
const _runningOnIOS = (Platform.OS == 'ios')

export function uuidv4() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export function screenWidth() {
  return Dimensions.get('window').width
}

export function isIphoneX () {
  //console.log("Dimensions.get('window').height = ", Dimensions.get('window').height, ((Platform.OS == 'ios') && (Dimensions.get('window').height === 896)))
  return ((Platform.OS == 'ios') && (Dimensions.get('window').height === 896 || Dimensions.get('window').height === 812));
}
// var fileArr=[];
export default class MediaCapture extends Component {
    static navigationOptions = {
        header: null
    }
    
    constructor (props) {
        super(props);
        this.fileArr=[];
        this.cameraPaused = false;
        this.timeVal = 0;
        this.appName = (this.props.navigation.state.params.appName) ? this.props.navigation.state.params.appName : "";
        this.onlyImage = (this.props.navigation.state.params.onlyImage != null) ? this.props.navigation.state.params.onlyImage : false//set only image to false by default
        this.maxSelections = (this.props.navigation.state.params.maxSelections) ? this.props.navigation.state.params.maxSelections : 10
        this.state = {
            percent:0,
            cameraType : RNCamera.Constants.Type.back,
            flashMode : RNCamera.Constants.FlashMode.off,
            vadded : false,
            timerKey : "00:00",
            closeKey : "clear",
            cameraKey : "camera-1",
            showSpinner : false
        }
    }

    _requestPermission = (camera) => {
        request( Platform.select({
                android: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
                ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
            })).then(response => {
            //console.log("after OK =="+ response)
            // Returns once the user has chosen to 'allow' or to 'not allow' access
            // Response is one of: 'authorized', 'denied', 'restricted', or 'undetermined'
            this.setState({ photoPermission: response })
            alert(response)
            if(response == RESULTS.GRANTED){
            this.selectMedia (camera);
            }
        })
    }

    _alertForPhotosPermission(message,camera) {
    Alert.alert(
        this.appName,
        message,
        [
        {text: 'No', onPress: () => console.log('Permission denied'), style: 'cancel'},
        this.state.photoPermission == 'undetermined'
        ? { text: 'Ok', onPress: this._requestPermission(camera) }
        : { text: 'Open Settings', onPress: () => { openSettings().catch(() => console.warn('Cannot Open Settings')) }},
        ],
        { cancelable: false }
        )
    }

    showSpinner (condition) {
        this.setState({showSpinner:condition})
    }


    render() {
        ref=this;
        return (
            <View style={styles.container}>
                <Spinner 
                    visible={this.state.showSpinner}
                    color = {_global.COLOR.ORANGE}
                    overlayColor = {'rgba(255, 255, 255, 0.10)'}
                    size = {'small'}
                    cancelable = {true}
                    />

                <RNCamera
                    style = {styles.preview}
                    key = {this.state.cameraKey}
                    type = {this.state.cameraType}
                    flashMode={this.state.flashMode}
                    permissionDialogTitle={'Permission to use camera'}
                    permissionDialogMessage={'We need your permission to use your camera phone'}>
                    {({ camera, status }) => {
                        //if (status !== 'READY') return <PendingView />;
                        return (
                            <View style = {styles.hfContainer}>
                                <View style = {styles.hContainer}>
                                    <TouchableOpacity style = {styles.hActionButton} onPress = {()=> this.flashTouched(camera)}>
                                        {(this.state.flashMode == RNCamera.Constants.FlashMode.auto) 
                                        ? <Image style = {styles.hiconImage} source={require('./assets/mesc_FlashIcon.png')}/>
                                        : <Image style = {styles.hiconImage} source={require('./assets/mesc_FlashIconGray.png')}/>
                                        }
                                    </TouchableOpacity>
                                    {/* {
                                        //timer setter
                                        (this.timeVal > kMSVideoStartDelay) && 
                                        <View style={styles.timerView}>
                                            <Image 
                                                style = {styles.recordImage} 
                                                source={require('../../assets/mesc_med_recording.png')}/>
                                            <Text style={styles.timeText} 
                                                 key = {this.state.timerKey}>
                                                {this.state.timerKey}
                                            </Text>
                                        </View>                                                
                                    } */}

                                    <TouchableOpacity style = {styles.hActionButton} key = {this.state.closeKey} onPress = {()=> (this.cameraPaused && this.selectedMedia != null) ? this.capturedImageApproved() : this.closeWindow()}>
                                        <Image style = {styles.hiconImage} source = {(this.cameraPaused && this.selectMedia != null) ? require('./assets/mesc_check_icon.png') : require('./assets/mesc_icon_close_white.png')}/>
                                    </TouchableOpacity>
                                </View>

                                {/* Media */}
                                <View style={styles.fContainer}>
                                    <TouchableOpacity style={styles.switch}
                                        onPress={() => this.selectMediaWithPermission(camera)}>
                                        <Image style = {styles.ficonImage}  source={require('./assets/mesc_gallery_icon.png')}/>
                                    </TouchableOpacity>

                                    <View style = {styles.captureContainer}>
                                        <TouchableOpacity style={styles.capture}
                                            onPressIn = {() => this.captureStarted(camera)}
                                            onPressOut = {() => this.captureOver(camera)}>
                                            <Progress.Circle
                                                size={70}
                                                progress={this.state.percent / (60)}
                                                indeterminate={false}
                                                color={_global.COLOR.RED}
                                                unfilledColor={_global.COLOR.LIGHTGRAY}
                                                borderWidth={0}
                                                showsText={false}
                                                >
                                            {/* <View style = {styles.captureInner}>
                                            {
                                                (this.cameraPaused) 
                                                ? <Image style = {styles.hiconImage} source = {require('../../assets/mesc_icon_close_white.png')}/>
                                                : <View/>
                                            }
                                            </View> */}
                                            </Progress.Circle>
                                        </TouchableOpacity>
                                        <Text style={styles.captureSuggestion}> {(this.onlyImage == false) 
                                            ? "Tap and hold for video, tap for photo"
                                            : "Click for the picture"
                                        }</Text>
                                        
                                    </View>    

                                    <TouchableOpacity style={styles.switch}
                                        onPress={() => this.switchCamera(camera)}>
                                        <Image style = {styles.ficonImage}  source={require('./assets/switch_image.png')}/>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                </RNCamera>
            </View>
        );
    }

    //header view callbacks
    flashTouched (camera) {
        if (this.state.flashMode == RNCamera.Constants.FlashMode.auto) {
            this.setState({flashMode : RNCamera.Constants.FlashMode.off})
        }else{
            if (_runningOnIOS) {
                this.setState({flashMode : RNCamera.Constants.FlashMode.auto})
            }else{
                this.setState({flashMode : RNCamera.Constants.FlashMode.on})
            }
        }
    }

    switchCamera () {
        if (this.state.cameraType == RNCamera.Constants.Type.back) {
            this.setState({cameraType:RNCamera.Constants.Type.front})
        }else{
            this.setState({
                cameraType : RNCamera.Constants.Type.back,
                flashMode : RNCamera.Constants.FlashMode.off,
            })
        }
    }

    closeWindow () {
        this.props.navigation.goBack()
    }


    capturedImageApproved() {
        //SEND CAPTURED MEDIA
        //this.mediaSelected(this.selectedMedia)
        this.processAndSendImage(this.selectedMedia.path)
    }

    captureStarted = async function(camera) {
        //console.log("captureStarted, this.cameraPaused = ", this.cameraPaused);
        if (this.cameraPaused) return; //do nothing

        this.timeVal = 0;
        this.camera = camera
        this.timer = setInterval(() => {//start timer
            this.timeVal += kMSTimeInterval
            //console.log("Time value = ", this.timeVal)

            if (this.onlyImage == false) {
                let delayFactor = (_runningOnIOS) ? kMSVideoStartDelay : (kMSVideoStartDelay * 2) 
                if (this.timeVal == delayFactor) {
                    this.captureVideo(this.camera)
                }
                
                // if(this.timeVal >= 60*1000){
                //     this.captureOver(this.camera);
                // }
                // else 
                if (this.timeVal >= delayFactor) this.displayVideoTimer(camera)
            }
        }, kMSTimeInterval);   
    }

    displayVideoTimer(camera) {
        
        let tv = ((this.timeVal - kMSVideoStartDelay) / 1000) * 2;//to converrt in second
        let min = parseInt(tv / 60)
        let remSec = tv % 60
        if (_runningOnIOS) {
            let v = min.toString().padStart(2, '0')+":"+remSec.toString().padStart(2, '0')
            this.setState({timerKey:v})
            this.setState({percent:remSec})
            console.log("remSec = ",remSec);
            if(remSec >= 59){
                // this.captureOver(this.camera);
                try{
                        console.log("press out called 1");
                        this.captureOver(camera);
                } catch(error){
                    console.log("error in press out call", error);
                }
            }
        } else {            
            //console.log("min.toString = ",tv, remSec, min, min.toString())
            let sMin = min.toString()
            let sRemSec = remSec.toString()
            const padded_smin = _.padStart(sMin, 2, '0');
            const padded_sremsec = _.padStart(sRemSec, 2, '0');
            console.log("min.padStart = ",padded_sremsec, padded_smin)
            let v = padded_smin+":"+padded_sremsec
            this.setState({timerKey:v})
            this.setState({percent:remSec})
            if(remSec >= 59){
                // this.captureOver(this.camera);
                try{
                        // console.log("press out called 1",this.cameraBtn);
                        this.captureOver(this.camera);
                } catch(error){
                    console.log("error in press out call", error);
                }
            }
        }
        
    }
    
    captureOver = async function(camera) {
        // if(captureComplete)
        //     return;
        // captureComplete = true;
        console.log("captureOver, this.cameraPaused = ", this.cameraPaused, "this.timeVal = ", this.timeVal);

        if (this.cameraPaused) {this.resumeCameraStream(camera); return;}

        //..
        clearInterval(this.timer);//press removed clear timer
        if (this.timeVal <= kMSVideoStartDelay || this.onlyImage) {//capture photo
            this.capturePicture(this.camera)
        }else {//since not capturing photo then it must have triggered video recording
            this.timeVal = 0;
            this.setState({percent:0})
            camera.stopRecording()
        }        
    }

    pauseCameraStream(camera)  {
        // console.log("camera obj",camera);
        try{
            camera.pausePreview();
            this.cameraPaused = true
            this.setState({closeKey:"close"})
        }catch(error){
            console.log("error in pauseCameraStream",error);
        }
       
    }

    resumeCameraStream(camera) {
        camera.resumePreview()
        this.cameraPaused = false
        this.selectedMedia = null

        //..
        this.timeVal = 0
        this.setState({percent:0})
        this.setState({timerKey:"00:00"})
    }

    //footer view callbacks
    /**
     interface TakePictureResponse {
            width: number;
            height: number;
            uri: string;
            base64?: string;
            exif?: { [name: string]: any };
        }
     */
    capturePicture = async function(camera) {
        //console.log("Capture Picture", this.cameraPaused, _runningOnIOS)
        if (!this.cameraPaused) {      
            //click picture
            var options = { quality: 0.5, base64: true };
            if (_runningOnIOS) this.pauseCameraStream(camera)  //pause camera show preview
            else {//as android gonna take time in image processing
                options = { quality: 0.3, width: 1920, fixOrientation: false, skipProcessing: true}
                this.showSpinner(true)
            } 
            
            //console.log("before await", options);
            const data = await camera.takePictureAsync(options);        
            //console.log("image data ==",data);

            //set file data
            let fname = this.mediaNameFromPath(data.uri)
            this.selectedMedia = this.getFileObject('image', fname, data.uri, data.width, data.height, 1*1024)//story in class veriable because it will be only used after being approved by user

            //pause camera show preview
            this.showSpinner(false)//in case spinner is showing
            if (!_runningOnIOS) this.pauseCameraStream(camera)  //pause camera show preview here as android wouldn't click picture if camera was paused before capture
        }   
    }

    /**
     * interface RecordResponse {
        uri: string;
        codec: VideoCodec[keyof VideoCodec];//iOS only
     */
    captureVideo = async function(camera) {
        //console.log("captureVideo");
        const options = { 
            quality: RNCamera.Constants.VideoQuality["480p"],
            maxDuration: 60.0, //1 minutes
            maxFileSize: 30*1024*1024, //30 MB 
        };

        //..
        const data = await camera.recordAsync(options);
        
        //pause video show preview and set file data
        this.pauseCameraStream(camera)

        //Gather data and open preview
        let fname = this.mediaNameFromPath(data.uri)
        let file = this.getFileObject('video', fname, data.uri)
        // if(Platform.OS == 'android'){
        //     processCapturedVideoAndSendVideo(data.uri);
        // }
        // else{
            this.props.navigation.navigate('MESVideoPlayer', {file:file, useCallback:this.capturedVideoApproved.bind(this), cancelCallBack:this.capturedVideoRejected.bind(this)})
        // }
    }

    processCapturedVideoAndSendVideo(path) {
        this.showSpinner(true)//

        //console.log("Video Selected")
        try{
            // var path = videoSelectionResponse.uri;
            if (_runningOnIOS) {
                if(path.indexOf("file://") != -1){
                    path = path.substring(7);
                }
            } else {
                if(path.indexOf("file://") == -1){
                    path = "file://"+path
                }
            }
            try{
                RNCompress.compressVideo(path, "medium").then((compressResponse) => {
                    path = compressResponse["path"];
                    if(!_runningOnIOS && path.indexOf("file://") == -1){
                        path = "file://"+compressResponse["path"];
                    }
                    
                    RNFetchBlob.fs.stat(path)
                    .then((stats) => {
                        console.log("captured video stats",stats);
                        if((stats) && (stats.size/1000000) > 30){
                            Toast.show("Selected file is too big!");
                            return;
                        }
                        
                        var name = path.substring(path.lastIndexOf('/'))
                        let file = this.getFileObject("video", name, path, 480, 320, stats.size/1000000)
                                                                
                        this.props.navigation.navigate('MESVideoPlayer', {file:file, useCallback:this.capturedVideoApproved.bind(this), cancelCallBack:this.capturedVideoRejected.bind(this)})
                    })
                    .catch((err) => {
                        console.log("RNFetchBlob Error = ", err)
                    })
                }).catch((error) => {
                    console.log("RNCompress", error);
                });
            }catch(error){
                console.log("Compress Error = ", error);
            }
        }catch(error){
            console.log("Other Error = ", error);
        }
    }



    //Video player callbacks
    capturedVideoApproved(videoMedia) {
        //SEND CAPTURED MEDIA
        this.mediaSelected(videoMedia)
    }

    capturedVideoRejected() {
        //SEND CAPTURED MEDIA
        captureComplete = false
        if (_runningOnIOS) this.setState({cameraKey:uuidv4()})
        this.resumeCameraStream(this.camera)

    }

    //play captured video
    /* playVideo(url) {
        if(_runningOnIOS){
            OpenFile.playMovie(url, (error, url) => {
                if (error) {
                    console.error("e.playMovie = ", error, url);
                } else {
                    console.log(url)
                }
            })
        }else{
            VideoPlayer.showVideoPlayer(urlstring);
        }
    }
    */

    //Plan is to keep image selection as simple as it can be and we'll do all the processing that is needed once user choose to upload the media files he have selected. As unless upload button is press all processing that we do on images may go in vain
    /**
     * Parameters:
     * ftyle: File Type
     * fname: File Name
     * fpath: File Path 
     * width: media width
     * height: media height 
     */
    // getFileObject(ftype, fname, fpath, width = 0, height = 0, size = 1*1024*1024) {
    //     let _i = uuidv4()
    //     var file = {
    //         "key" : _i,
    //         "type" : "local",
    //         "fileType" : ftype,
    //         "path" : fpath,
    //         "width" : width ,
    //         "height" : height,
    //         "fileName" : fname,
    //         "size" : size
    //     }
    //     console.log("file object",file);
    //     return file
    // }

    getFileObject(ftype, fname, fpath, width, height, size) {
        let _i = uuidv4()
        var file = {
            "key" : _i,
            "type" : "local",
            "fileType" : ftype,
            "path" : fpath,
            "width" : (width) ? width :0,
            "height" : (height) ? height : 0,
            "fileName" : fname,
            "size" : (size) ? size : (1*1024*1024)
        }
        console.log("file object",file);
        return file
    }

    isImage (mediaName) {
        var extension = mediaName.substring(mediaName.lastIndexOf('.') + 1, mediaName.length);
        //console.log("mediaName = ", mediaName, "extension = ", extension)
        return (_global.KImageTypes.indexOf(extension.toLowerCase()) > -1)
    }

    //PLATEFORM AND LIBRARY DEPENDENT PATH
    // - WHILE CALLING WEBSERVICE WE NEED PAT TO BE PREFIXED WITH "file://"
    // - WHILE PASSING PATH TO LIBRARIES WE NEED IT TO BE WITHOUT THAT PREFIX
    // - ANDROID IMAGE SELECTION DOESN'T RETURN PATH WITH :FILE AS PREFIX
    // - IOS DOES THAT
    getPFDPath (fetchedPath) {
        if(!_runningOnIOS){
            fetchedPath = "file://"+fetchedPath;
        }
        //console.log("Image Selected:", fetchedPath)
        return fetchedPath
    }

    mediaNameFromPath(path) {
        return path.substring(path.lastIndexOf('/'))
    }

    //RESPONSE of IMAGE PICKER
    /**
     * Response:
     * VIDEO: {"origURL":"assets-library://asset/asset.MOV?id=C045D89D-7806-4E6F-BC62-247ECCED1C43&ext=MOV","fileName":"22.mov","timestamp":"2018-08-03T03:12:39Z","uri":"file:///Users/technologies33/Library/Developer/CoreSimulator/Devices/C957E419-4B97-4A4E-A451-D4B711E45D82/data/Containers/Data/Application/8FEDA21C-BEA2-4DEE-A7C7-A10C0FA0A80F/Documents/images/EB95F845-D01C-4BC7-803F-79940F1B215D.MOV"}
     * IMAGE: {"isVertical":true,"origURL":"assets-library://asset/asset.JPG?id=7B9AFB50-1BC2-4F15-A901-A2F687F3E01C&ext=JPG","height":265,"data":"/9j/4//Z","fileName":"IMG_0042.JPG","width":200,"fileSize":3309,"timestamp":"2018-08-03T03:32:30Z","uri":"file:///Users/technologies33/Library/Developer/CoreSimulator/Devices/C957E419-4B97-4A4E-A451-D4B711E45D82/data/Containers/Data/Application/8FEDA21C-BEA2-4DEE-A7C7-A10C0FA0A80F/Documents/images/666C7194-4D3E-4556-AD2D-5E9D4C338352.jpg"}
     */
    //for multiple media selection flow
    /*selectMedia () {
        var options = {
            title: strings("miscellaneous.select"),
            storageOptions: {
                skipBackup: true,
                path: 'images'
            },
            mediaType:'mixed'
        };
        
        _imagePicker.launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            }
            else if (response.error) {
                console.log('_imagePicker Error: ', response.error);
            }
            else {
                try {
                    console.log("Media Response =", JSON.stringify(response), response.fileName)
                    if( response == null || response.uri == null ) return;

                    let ftype = this.isImage(response.fileName) ? "image" : "video"
                    let fpath = this.isImage(response.url)
                    let file = this.getFileObject(ftype, response.fileName, fpath)
                }
                catch(error){
                    console.log("Image Capture Error:", error)
                }
            }
        })
        
        // ImagePicker.openPicker({
        //     width: 300,
        //     height: 400,
        //     cropping: true
        //   }).then(image => {
        //     console.log(image);
        //   });
    } */

    //Video
    /**
     { 
        origURL: 'assets-library://asset/asset.MP4?id=1B3E286E-1B4F-4A5B-9F07-C929BC9F5D11&ext=MP4',
        fileName: 'ccc60083-36ea-44b3-96f2-ea66f5f54ae0.mp4',
        timestamp: '2018-08-13T07:57:28Z',
        uri: 'file:///var/mobile/Containers/Data/Application/7A5E5A64-6AF8-4B62-AA30-591073C6CEF6/Documents/images/5126D72E-DBE7-4C95-B025-D68F2253FF84.MOV' 
    }
    */
    
    selectMediaWithPermission(camera){
        try{
            var perArray = [PERMISSIONS.IOS.CAMERA,PERMISSIONS.IOS.MEDIA_LIBRARY,PERMISSIONS.IOS.PHOTO_LIBRARY];
            if(Platform.OS == "android"){
                perArray = [PERMISSIONS.ANDROID.CAMERA,PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE];
            }
            checkMultiple(perArray).then(response => {
                var camPermission = response[Platform.select({
                    android: PERMISSIONS.ANDROID.CAMERA,
                    ios: PERMISSIONS.IOS.CAMERA,
                  })]
                var picPermission = response[Platform.select({
                    android: PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
                    ios: PERMISSIONS.IOS.MEDIA_LIBRARY,
                  })];
              this.setState({
                cameraPermission: camPermission,
                photoPermission: picPermission,
              })
              //alert(picPermission)
              if(picPermission && (picPermission == RESULTS.GRANTED|| picPermission == RESULTS.DENIED)){
                this.selectMedia (camera);
                // this.selectMultipleMedia(camera);
              }
              else{
                  ref._alertForPhotosPermission("Allow to access your gallery",camera)
              }
            })
          
          }catch(error){
            console.log(error);
          }
    }

    selectMedia (camera) {
      console.log("before pause!!!!!=====")
        this.pauseCameraStream(camera)

        var options = {
            title: "Select",
            storageOptions: {
                skipBackup: true,
                path: 'images'
            },
            mediaType: (this.onlyImage) ? 'image' : 'mixed',
            maxSelections : this.maxSelections
            // mediaType: (this.onlyImage) ? 'image' : ((Platform.OS == 'ios') ? 'mixed' : 'video')
        };


        // if (Platform.OS == 'android') {
            ImagePicker.openPicker({
                multiple: true,
                mediaType: (this.onlyImage) ? 'photo' : 'any',
                cropping: false,
                showsSelectedCount: true,
                maxFiles:this.maxSelections
            }).then(images => {
                this.resumeCameraStream(camera)
                console.log("images = ", images);
                if(images.length > 0){
                    var allPaths = [];
                    var j =0;
                    for(j=0;j<images.length;j++){
                        allPaths.push(images[j].path);
                    }
                    this.manageSelectedMedias(allPaths,0);
                }
            })
          // }else{
          //   try{
          //     console.log("before _imagePicker!!!!!=====")
          //     _imagePicker.launchImageLibrary(options, (response) => {
          //       console.log('_imagePicker response: ', response);
          //         if (response.didCancel) {
          //             this.resumeCameraStream(camera)
          //             console.log('User cancelled image picker');
          //         }
          //         else if (response.error) {
                      
          //             this.resumeCameraStream(camera)
          //             console.log('_imagePicker Error: ', response.error);
          //         }
          //         else {
          //             try {
          //               console.log("Media Response full =", (response));
          //                 console.log("Media Response =", (response.pathUriArray));
          //                     if( response==null || response.pathUriArray==null ) return;
          //                     var pathArr = JSON.parse(response.pathUriArray);
          //                     if(pathArr.length > 0){
          //                         this.manageSelectedMedias(pathArr,0);
          //                         // if(this.isImage(pathArr[0])) {
          //                         //     this.manageImages(pathArr,0);
          //                         // }
          //                         // else{
          //                         //     this.manageVideos(pathArr,0);
          //                         // }
          //                     }
          //                     console.log("after loop arr= ",this.fileArr)
          //                     // return;
          //             }catch(error){
          //                 Toast.show(error);
          //             }
          //         }
          //     });
          //   }catch(error){
          //     console.log("c", error);
          //   }
            
       // } 
    }

    processAndSendImage (path) {
        this.showSpinner(true)

        //..
        var compressPercent = 40;  
        //console.log("Image Selected:", path)

        try{
            Marker.markText({
                src: path,// (!_runningOnIOS) ? path.replace('file://', '') : path,
                text: this.appName,
                position: "bottomRight",
                color: '#D3D3D3',
                fontName: "Helvetica-light",//strings("font.regularLight"),
                fontSize: (!_runningOnIOS) ? 40 : 42,
                scale: (!_runningOnIOS) ? .5 : 1,
                quality: 100,
                shadowStyle: {
                  dx: 10.5,
                  dy: 20.8,
                  radius: 20.9,
                  color: '#ff00ff'
              },
              textBackgroundStyle: {
                  type: 'stretchX',
                  paddingX: 10,
                  paddingY: 10,
                  color: '#0f0'
              },

            }).then((markedImageResponse) => {
                    this.createResizeImage(markedImageResponse)
            }).catch((err) => {
                console.log(err)
            })
        }catch(err){
            console.log(err);
        }
    }

    manageSelectedMedias(arr,x){

        console.log("in manageSelectedMedias ",x);
        if(this.isImage(arr[x])) {
            this.manageImages(arr,x);
        }else{
            this.manageVideos(arr,x);
        }
    }
    
    manageVideos(arr,x){
        this.customVideoWork(arr[x],() => {
            x++;
            if(x < arr.length){
                this.manageSelectedMedias(arr,x);
                // this.manageVideos(arr,x);
            }else{
                this.showSpinner(false)
                console.log("sending Array in callback from media capture");
                this.props.navigation.state.params.mediaSelectionCallBack(this.fileArr);
                this.props.navigation.goBack()
            }
        })
    }

    customVideoWork(videoSelectionResponse,callback){
        this.showSpinner(true)
        try{
            // var path = (Platform.OS == 'ios') ? videoSelectionResponse.uri : videoSelectionResponse.path;
            var path =  videoSelectionResponse ;//.uri;
            if (_runningOnIOS) {
                if(path.indexOf("file://") != -1){
                    path = path.substring(7);
                }
            } else {
                if(path.indexOf('content://') != -1){
                    path = path.substring(10);
                }
                if(path.indexOf("file://") == -1){
                    // path = "file://"+videoSelectionResponse.path;\
                    path = "file://"+videoSelectionResponse;
                }
            }
            try{
                console.log("path before compress = ",path);
                RNCompress.compressVideo(path, "medium").then((compressResponse) => {
                    path = compressResponse["path"];
                    if(!_runningOnIOS && path.indexOf("file://") == -1){
                        path = "file://"+compressResponse["path"];
                    }
                    
                    RNFetchBlob.fs.stat(path)
                    .then((stats) => {
                        if((stats) && (stats.size/1000000) > 30){
                            Toast.show("Selected file is too big!");
                            return;
                        }
                        
                        var name = path.substring(path.lastIndexOf('/'))
                        if(Platform.OS == 'android'){
                            var extension  = ((name.indexOf('.') != -1) ? name.substring(name.lastIndexOf('.')) : '.mp4')
                            name = uuidv4()+ extension;
                            console.log("new name ==", name);
                        }
                        let file = this.getFileObject("video", name, path, 480, 320, stats.size/1000000)
                                                                
                        //SEND VIDEO
                        // this.mediaSelected(file)
                        // resolve(file);
                        this.fileArr.push(file);
                        callback();
                    })
                    .catch((err) => {
                        console.log("RNFetchBlob Error = ", err)
                        reject(err)
                    })
                }).catch((error) => {
                    console.log("RNCompress", error);
                    reject(error)
                });
            }catch(error){
                console.log("Compress Error = ", error);
                reject(error)
            }
        }catch(error){
            console.log("Other Error = ", error);
            reject(error)
        }
    }

    manageImages(arr,x){
        this.customImageWork(arr[x],() => {
            x++;
            if(x < arr.length){
                this.manageSelectedMedias(arr,x);
                // this.manageImages(arr,x);
            }else{
                this.showSpinner(false)
                console.log("sending Array in callback from media capture");
                this.props.navigation.state.params.mediaSelectionCallBack(this.fileArr);
                this.props.navigation.goBack()
            }
        })
    }

    customImageWork(markedImageResponse,callback){
        this.showSpinner(true)
        try{
            var compressPercent = 40; 
            ImageResizer.createResizedImage(markedImageResponse, 600, 600, 'JPEG', compressPercent, 0, null).then((compressedImageResponse) => {
                console.log("ImageResizer done response = ",compressedImageResponse)
                var path = compressedImageResponse.uri;
                if (_runningOnIOS) {
                    if(path.indexOf("file://") != -1) {
                        path = path.substring(7);
                    }
                }
                else {
                    if(path.indexOf('content://') != -1){
                        path = path.substring(10);
                    }
                    if(path.indexOf("file://") == -1){
                        path = "file://"+path;
                    }
                }
                
                RNFetchBlob.fs.stat(path)
                .then((stats) => {
                    console.log("RNFetchBlob stat = ", stats);
                    let size = (stats) ? stats.size/1000000 : 0
                    if (size == 0 || size > 5){
                        Toast.show("The specified file is too large");
                        return;
                    }
    
                    Image.getSize(compressedImageResponse.uri, (width, height) => {
                        console.log("in image get size");
                        let file = this.getFileObject("image", compressedImageResponse.name, compressedImageResponse.uri, width, height, stats.size)
                        
                        //SEND SELECTED IMAGE
                        // this.mediaSelected(file)
                        // this.fileArr.push(file);
                        // resolve(file);
                        this.fileArr.push(file);
                        callback();
                    });
                })
                .catch((err) => {
                    console.log("in RNFetchBlob error=",err)
                    reject(err)
                })
            })
            .catch((err) => {
                console.log(`error at resizing image: ${err}`);
                reject(err)
            });
        }catch(error){
            console.log("first try error =",error);
            reject(error);
        }
    }

    createResizeImage(markedImageResponse){
        try{
        var compressPercent = 40; 
        ImageResizer.createResizedImage(markedImageResponse, 600, 600, 'JPEG', compressPercent, 0, null).then((compressedImageResponse) => {
            console.log("ImageResizer done response = ",compressedImageResponse)
            var path = compressedImageResponse.uri;
            if (_runningOnIOS) {
                if(path.indexOf("file://") != -1) {
                    path = path.substring(7);
                }
            }
            else {
                if(path.indexOf('content://') != -1){
                    path = path.substring(10);
                }
                if(path.indexOf("file://") == -1){
                    path = "file://"+videoSelectionResponse.path;
                }
            }
            
            RNFetchBlob.fs.stat(path)
            .then((stats) => {
                console.log("RNFetchBlob stat = ", stats);
                let size = (stats) ? stats.size/1000000 : 0
                if (size == 0 || size > 5){
                    Toast.show("The specified file is too large");
                    return;
                }

                Image.getSize(compressedImageResponse.uri, (width, height) => {
                    console.log("in image get size");
                    let file = this.getFileObject("image", compressedImageResponse.name, compressedImageResponse.uri, width, height, stats.size)
                    
                    //SEND SELECTED IMAGE
                    this.mediaSelected(file)
                    // this.fileArr.push(file);
                });
            })
            .catch((err) => {
                console.log("in RNFetchBlob error=",err)
            })
        })
        .catch((err) => {
            console.log(`error at resizing image: ${err}`);
        });
    }catch(error){
        console.log("first try error =",error);
    }
    }

    processAndSendVideo(videoSelectionResponse) {
        this.showSpinner(true)//
        // console.log("Video Selected")
        // console.log(videoSelectionResponse);
        // return;
        //console.log("Video Selected")
        try{
            // var path = (Platform.OS == 'ios') ? videoSelectionResponse.uri : videoSelectionResponse.path;
            var path =  videoSelectionResponse.uri;
            if (_runningOnIOS) {
                if(path.indexOf("file://") != -1){
                    path = path.substring(7);
                }
            } else {
                if(path.indexOf('content://') != -1){
                    path = path.substring(10);
                }
                if(path.indexOf("file://") == -1){
                    // path = "file://"+videoSelectionResponse.path;\
                    path = "file://"+videoSelectionResponse;
                }
            }
            try{
                RNCompress.compressVideo(path, "medium").then((compressResponse) => {
                    path = compressResponse["path"];
                    if(!_runningOnIOS && path.indexOf("file://") == -1){
                        path = "file://"+compressResponse["path"];
                    }
                    
                    RNFetchBlob.fs.stat(path)
                    .then((stats) => {
                        if((stats) && (stats.size/1000000) > 30){
                            Toast.show("Selected file is too big!");
                            return;
                        }
                        
                        var name = path.substring(path.lastIndexOf('/'))
                        if(Platform.OS == 'android'){
                            var extension  = ((name.indexOf('.') != -1) ? name.substring(name.lastIndexOf('.')) : '.mp4')
                            name = uuidv4()+ extension;
                            console.log("new name ==", name);
                        }
                        let file = this.getFileObject("video", name, path, 480, 320, stats.size/1000000)
                                                                
                        //SEND VIDEO
                        this.mediaSelected(file)
                    })
                    .catch((err) => {
                        console.log("RNFetchBlob Error = ", err)
                    })
                }).catch((error) => {
                    console.log("RNCompress", error);
                });
            }catch(error){
                console.log("Compress Error = ", error);
            }
        }catch(error){
            console.log("Other Error = ", error);
        }
    }

    //..
    mediaSelected (file) {
        this.showSpinner(false);
        //console.log("Media file selected:", file)
        if (file != null) {
            this.props.navigation.state.params.mediaSelectionCallBack([file]);
            this.props.navigation.goBack()
        }else {
            Toast.show("Nothing Captured")
        }
    }
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'black',
    },
    preview: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    //
    hfContainer: {
        flex : 1,
        justifyContent: 'space-between',
    },

    //header
    hContainer: {
        width : screenWidth(),
        paddingLeft:8,
        paddingRight:8,
        flexDirection : 'row',
        justifyContent: 'space-between',
        backgroundColor: '#333333',
        paddingTop : isIphoneX() ? 44  : 24
    },

    hActionButton :  {
        width : 44,
        height : 44,
        padding : 6,
        //backgroundColor : 'red'
    },
    hiconImage : {
        resizeMode:'contain',
        width : 20,
        height : 20,
        paddingTop : 6
    },

    //footer
    fContainer: {
        width : screenWidth(),
        padding : 8,
        flexDirection : 'row',
        justifyContent : 'space-between',
        backgroundColor : '#333333',
        paddingBottom : isIphoneX() ? 24  : 10
    },

    textEventContainer: {
        height : 70.0,
        flex: 0.2,
        paddingHorizontal: 10,
        alignSelf: 'center',
        margin: 10,
        justifyContent : 'center',
        alignItems : 'center'
    },
    captureContainer: {
        flex: 0.6,
        // backgroundColor:'red',
        alignSelf: 'center',
        margin: 10,
    },

    capture: {
        // backgroundColor:'blue',
        // backgroundColor: '#fff',
        borderRadius: 35,
        width : 70,
        height : 70,
        justifyContent: 'center',
        alignSelf: 'center',
        alignItems:'center',
    },

    captureInner: {
        backgroundColor: '#333',
        borderRadius: 30,
        width : 60,
        height : 60,
        alignSelf: 'center',
        alignItems : 'center',
        justifyContent : 'center',
    },

    captureSuggestion: {
        alignSelf: 'center',
        textAlign: 'center',
        color : "#fff",
        margin: 4,
        fontSize : 10
    },

    switch: {
        flex: 0.2,
        paddingHorizontal: 10,
        alignSelf: 'center',
        alignItems: 'center',
        margin: 10,
    },

    backgroundVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },

    timerView : { 
        padding : 4,
        fontSize: 14, 
        borderRadius : 4.8,
        backgroundColor:"#ddd", 
        borderRadius:4,  
        alignSelf : 'center',
        flexDirection : 'row',
        justifyContent:'center',
        alignItems:'center'
    },

    recordImage:{
        width:8,
        height:8,
        margin : 2,
        resizeMode:'contain'
    },

    timeText : {
        fontSize: 14, 
        alignSelf:'center'
    },

    ficonImage : {
        resizeMode:'contain',
        width : 32,
        height : 32,
    }
});