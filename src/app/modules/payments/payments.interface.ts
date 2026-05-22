import { IntervalEnum } from "../config/config.interface";

export interface IPayment {
  amount: number;
  type: "one_time" | "recurring";
  interval: IntervalEnum | null;
  intervalCount: number | null;
  dedication?: {
    firstName: string;
    lastName: string;
    notify?: {
      firstName: string;
      lastName: string;
      email: string;
      message: string;
    };
  };
  paymentDetails: {
    companyName?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  paymentId: string;
  paymentStatus: string;
  issueReceipt: boolean;
  receiptSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}
