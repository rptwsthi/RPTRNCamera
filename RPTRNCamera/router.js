// import {
//   View,Image, TouchableOpacity,Platform,Text,StyleSheet
// } from 'react-native';
import {createAppContainer} from 'react-navigation';
import {createStackNavigator } from 'react-navigation-stack';
import Home from './Home';
import MediaCapture from './mes-media-capture'

export const AppStack = createStackNavigator({
Home: {
  screen : Home
},
MediaCapture : {
  screen : MediaCapture
}
})

export const Nav = createAppContainer(AppStack);