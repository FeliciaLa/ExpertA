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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div></div>
              <h2 className="text-2xl font-bold text-gray-900">
                Payment Successful!
              </h2>
          <button
            onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
            </div>
            <p className="text-gray-600">
              {expertName === 'The Stoic Mentor' 
                ? 'Your premium message pack is now active'
                : 'Your premium consultation session is now active'
              }
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">
                {expertName === 'The Stoic Mentor' ? '20 Messages Active' : `${sessionDuration}-Minute Session Active`}
              </span>
            </div>
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex justify-between">
                <span>Expert:</span>
                <span className="font-medium">{expertName}</span>
              </div>
              <div className="flex justify-between">
                <span>{expertName === 'The Stoic Mentor' ? 'Messages:' : 'Duration:'}</span>
                <span>{expertName === 'The Stoic Mentor' ? '20 messages' : `${sessionDuration} minutes`}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount paid:</span>
                <span>£{amountPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>
              {expertName === 'The Stoic Mentor' 
                ? '💬 Your 20 message credits are now available'
                : '🕒 Your session timer will start with your next message'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessDialog; 