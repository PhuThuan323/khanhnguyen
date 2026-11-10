import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {encodeJson} from '../src/services/jsonResponse.js';
test('Payload danh sách xe lớn được gzip, giảm dữ liệu truyền tải',async()=>{
 const sample=Array.from({length:200},(_,i)=>({plate:`66A-${i}`,notes:'Xe đang bảo dưỡng, có nhiều ảnh kiểm định và lịch sử làm việc. '.repeat(15)}));
 const encoded=await encodeJson(sample,'gzip, deflate, br');
 assert.equal(encoded.compressed,true);
 assert.ok(encoded.body.length<encoded.rawBytes*.3);
 assert.deepEqual(JSON.parse(gunzipSync(encoded.body).toString('utf8')),sample);
});
test('Phản hồi nhỏ và client không hỗ trợ gzip vẫn trả JSON thô',async()=>{
 const value={message:'Bảo dưỡng'};
 const plain=await encodeJson(value,'gzip');assert.equal(plain.compressed,false);
 const noGzip=await encodeJson(Array(5000).fill('a'),'identity');assert.equal(noGzip.compressed,false);
});
