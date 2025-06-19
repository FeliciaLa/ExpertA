import React from 'react';
import { CheckCircle, Clock, X } from 'lucide-react';

interface PaymentSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expertName: string;
  sessionDuration: number; // in minutes
  amountPaid: number;
}

const PaymentSuccessDialog: React.FC<PaymentSuccessDialogProps> = ({
  isOpen,
  onClose,
  expertName,
  sessionDuration,
  amountPaid
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600">
              Your premium consultation session is now active
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">
                {sessionDuration}-Minute Session Active
              </span>
            </div>
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex justify-between">
                <span>Expert:</span>
                <span className="font-medium">{expertName}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{sessionDuration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span>Amount paid:</span>
                <span>£{amountPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600 mb-6">
            <p>
              ✨ <strong>You can now ask detailed questions</strong> and get comprehensive expert advice
            </p>
            <p>
              🕒 Your session timer will start with your next message
            </p>
            <p>
              📧 A receipt has been sent to your email address
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Start Your Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessDialog; 