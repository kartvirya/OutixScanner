declare module 'expo-camera' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface CameraProps extends ViewProps {
    type?: number;
    flashMode?: number;
    autoFocus?: boolean | string;
    zoom?: number;
    whiteBalance?: number | string;
    barCodeScannerSettings?: {
      barCodeTypes?: string[];
    };
    onBarCodeScanned?: (data: { type: string; data: string }) => void;
  }

  export class Camera extends Component<CameraProps> {
    static Constants: {
      Type: {
        front: number;
        back: number;
      };
      FlashMode: {
        on: number;
        off: number;
        auto: number;
        torch: number;
      };
    };

    static requestCameraPermissionsAsync(): Promise<{ status: string }>;
  }
} 