export interface IIncomes {
    id: string;
    productName: string;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    clientWhApp?: string;
    clientTg?: string;
    price: string;
    createdDate: Date;
    createdBy?: string; 
    createdByName?: string; 
    lastEditedBy?: string; 
    lastEditedByName?: string;
  }