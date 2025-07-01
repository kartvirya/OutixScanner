declare module 'expo-camera' {
  import { Component } from 'react';
    import { ViewProps } from 'react-native';

  export interface CameraViewProps extends ViewProps {
    facing?: 'front' | 'back';
    flashMode?: 'on' | 'off' | 'auto' | 'torch';
    autoFocus?: boolean | string;
    zoom?: number;
    whiteBalance?: number | string;
    barcodeScannerSettings?: {
      barcodeTypes?: string[];
    };
    onBarcodeScanned?: (data: { type: string; data: string }) => void;
    onCameraReady?: () => void;
  }

  export interface CameraPermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    granted: boolean;
    canAskAgain: boolean;
    expires: 'never' | number;
  }

  export type RequestPermissionMethod = () => Promise<CameraPermissionResponse>;

  export function useCameraPermissions(): [
    CameraPermissionResponse | null,
    RequestPermissionMethod
  ];

  export class CameraView extends Component<CameraViewProps> {}

  // Legacy Camera API for backwards compatibility
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