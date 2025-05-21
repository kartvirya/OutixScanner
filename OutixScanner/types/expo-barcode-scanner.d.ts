declare module 'expo-barcode-scanner' {
  export interface BarCodeEvent {
    type: string;
    data: string;
    bounds?: {
      origin: {
        x: number;
        y: number;
      };
      size: {
        width: number;
        height: number;
      };
    };
  }

  export class BarCodeScanner {
    static Constants: {
      BarCodeType: {
        qr: string;
        pdf417: string;
        aztec: string;
        code39: string;
        code93: string;
        code128: string;
        datamatrix: string;
        ean8: string;
        ean13: string;
        itf14: string;
        upc_e: string;
      };
    };

    static requestPermissionsAsync(): Promise<{ status: string }>;
  }
} 