declare module '@flutterwave/react' {
    export interface FlutterWaveResponse {
        status: string; // e.g., "success", "failed"
        tx_ref: string; // Transaction reference
        transaction_id: string; // Unique transaction ID
        amount: number; // Amount paid
        currency: string; // Currency code (e.g., "USD", "NGN")
        customer: {
            email: string;
            name?: string; // Optional: Name of the customer
            phone_number?: string; // Optional: Customer's phone number
        };
        processor_response?: string; // Response from the payment processor
        [key: string]: unknown; // For any additional properties
    }
    

    export interface FlutterWaveButtonProps {
        text: string;
        className?: string;
        callback: (response: FlutterWaveResponse) => void; // Use the defined type here
        onClose: () => void;
        disabled?: boolean;
        config: FlutterWaveConfig;
    }
    

    export const FlutterWaveButton: React.FC<FlutterWaveButtonProps>;
    export const closePaymentModal: () => void;
}
