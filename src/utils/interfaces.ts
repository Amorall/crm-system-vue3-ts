import type { Timestamp } from "firebase/firestore"

export interface IProductInSale {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
}
export interface IIncome {
  id: string
  products: IProductInSale[]
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientWhApp?: string
  clientTg?: string
  status: string
  createdDate: Date | Timestamp
  createdBy?: string
  createdByName?: string
  lastEditedBy?: string
  lastEditedByName?: string
  lastEditedDate: Date | Timestamp
}

export interface IExpense {
  id: string;
  amount: number;
  description: string;
  date: Date | Timestamp;
  createdBy: string;
  createdByName: string;
  lastEditedBy?: string;
  lastEditedByName?: string;
  lastEditedDate?: Date | Timestamp;
  type: 'product' | 'marketing' | 'salary' | 'other';
  productId?: string | null;
}

export interface IExpenseCategory {
  value: string;
  label: string;
}

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  purchasePrice: number;
  stock: number;
  category: string;
  imageUrl?: string | null;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}