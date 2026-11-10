export const WORKABLE_CAR_STATES=new Set(['MAINTENANCE','READY_FOR_REVIEW','FOR_SALE','CUSTOMER_CLOSED','DEPOSITED','SOLD']);
/** Later maintenance is an additional expense, not a transition back to MAINTENANCE. */
export function canRecordMaintenance(status){return WORKABLE_CAR_STATES.has(status)}
export function canCloseInspection(role,status){return role==='ADMIN'&&status==='INSPECTION'}
export function validateExpensePayee(payeeType,assignedToId,payeeName){
 if(payeeType==='EMPLOYEE')return assignedToId?'': 'Cần chọn nhân viên nhận chi phí.';
 if(!['WORKSHOP','SUPPLIER','OTHER'].includes(payeeType))return 'Loại đơn vị nhận chi không hợp lệ.';
 return payeeName?.trim()?'':'Cần nhập tên xưởng/đơn vị nhận chi.';
}
export const addVehicleDocumentCost=(amount,document)=>Number(amount||0)+Number(document?.cost||0);
