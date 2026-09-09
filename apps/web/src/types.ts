export type Role='ADMIN'|'SALES'|'WAREHOUSE'|'ACCOUNTS';
export type User={id:string;email:string;fullName:string;role:Role};
export type Customer={id:string;name:string;mobile:string;email?:string;businessName:string;gstNumber?:string;type:string;address:string;status:string;followUpDate?:string;notes?:string};
export type Product={id:string;name:string;sku:string;category:string;unitPrice:number;currentStock:number;minStock:number;warehouse:string;stockStatus:'OK'|'LOW'|'OUT'};
export type Challan={id:string;challanNumber:string;status:string;totalQuantity:number;createdAt:string;confirmedAt?:string;customerId:string;customer:string;createdBy:string};
