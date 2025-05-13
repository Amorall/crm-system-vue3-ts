import type { Timestamp } from "firebase/firestore"

export type ExpenseCategory = 'purchase' | 'marketing' | 'salary' | 'other'

export interface IProductInSale {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
export interface IIncome {
  id: string
  products: IProductInSale[]
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientWhApp?: string
  clientTg?: string
  price: string
  status: string
  createdDate: Date | Timestamp
  createdBy?: string
  createdByName?: string
  lastEditedBy?: string
  lastEditedByName?: string
  lastEditedDate: Date | Timestamp
}

export interface IExpense {
  id: string
  name: string
  amount: number
  category: ExpenseCategory
  description?: string
  createdBy: string
  createdByName: string
  createdDate: Date | Timestamp
  lastEditedBy: string
  lastEditedByName: string
}

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  features: string[];
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}