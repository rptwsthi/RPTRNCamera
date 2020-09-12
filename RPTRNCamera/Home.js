/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React , { Component } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Button
} from 'react-native';
import {PERMISSIONS, checkMultiple, request, requestMultiple, RESULTS, openSettings} from 'react-native-permissions';


class Home extends Component {

  constructor(props){
    super(props)
  }

  mediaSelected(media) {
    
  }

  _alertForCameraPermission(message) {
    Alert.alert(
        strings('miscellaneous.appName'),
        message,
        [
          {text: strings('miscellaneous.no'), onPress: () => console.log('Permission denied'), style: 'cancel'},
          this.state.cameraPermission == 'undetermined'
            ? { text: strings('miscellaneous.ok'), onPress: this._requestPermission }
            : { text: strings('miscellaneous.openSettings'), onPress: () => { openSettings().catch(() => console.warn(strings('miscellaneous.cannotOpenSettings'))) }},
        ],
        { cancelable: false }
        )
}

  showPicker = () => {
    try{
      checkMultiple([ Platform.select({
        android: PERMISSIONS.ANDROID.CAMERA,
        ios: PERMISSIONS.IOS.CAMERA,
      })]).then(response => {
        //response is an object mapping type to permission
        var status = response[Platform.select({
                      android: PERMISSIONS.ANDROID.CAMERA,
                      ios: PERMISSIONS.IOS.CAMERA,
                    })]
        this.setState({cameraPermission: status})

        if(status && (status == RESULTS.GRANTED|| status == RESULTS.DENIED)){
          this.props.navigation.navigate('MediaCapture', {
              onlyImage:false,
              maxSelections :1,
              appName : "Custome Cam",
              mediaSelectionCallBack:this.mediaSelected.bind(this), 
              navigation : this.props.navigation
          })
        }
        else{
          var msg = strings("mediaCapture.cameraPermission");
          this._alertForCameraPermission(msg);
        }
      })
    }catch(error){
      console.log(error);
    }
  }

  render = () => {
    return(
      <View>
        <Button
          onPress={this.showPicker}
          title="OPEN CAMERA"
          color="#841584"
          accessibilityLabel=""
        />
      </View>
    );
  }

}

// const styles = StyleSheet.create({
//   scrollView: {
//     backgroundColor: Colors.lighter,
//   },
//   engine: {
//     position: 'absolute',
//     right: 0,
//   },
//   body: {
//     backgroundColor: Colors.white,
//   },
//   sectionContainer: {
//     marginTop: 32,
//     paddingHorizontal: 24,
//   },
//   sectionTitle: {
//     fontSize: 24,
//     fontWeight: '600',
//     color: Colors.black,
//   },
//   sectionDescription: {
//     marginTop: 8,
//     fontSize: 18,
//     fontWeight: '400',
//     color: Colors.dark,
//   },
//   highlight: {
//     fontWeight: '700',
//   },
//   footer: {
//     color: Colors.dark,
//     fontSize: 12,
//     fontWeight: '600',
//     padding: 4,
//     paddingRight: 12,
//     textAlign: 'right',
//   },
// });

export default Home;
