export type ExpenseCategory = 'purchase' | 'marketing' | 'salary' | 'other'

export interface IIncome {
  id: string
  productName: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientWhApp?: string
  clientTg?: string
  price: string
  status: string
  createdDate: Date
  createdBy?: string
  createdByName?: string
  lastEditedBy?: string
  lastEditedByName?: string
  lastEditedDate: Date
}

export interface IExpense {
  id: string
  name: string
  amount: number
  category: ExpenseCategory
  description?: string
  createdBy: string
  createdByName: string
  createdDate: Date
  lastEditedBy: string
  lastEditedByName: string
}
