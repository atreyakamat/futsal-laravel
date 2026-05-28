"use strict";exports.id=7229,exports.ids=[7229],exports.modules={17229:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.d(b,{P9:()=>j,rJ:()=>h,uD:()=>i,z9:()=>k});var e=c(85509),f=c(64240),g=a([e]);function h(a){return`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(a)}`}function i(a){let b=(0,f.WC)(a.slots),c=h(a.ticketNumbers[0]??a.bookingRef),d=a.ticketNumbers.join(", "),e=`/booking/ticket/${encodeURIComponent(a.bookingRef)}?download=1`;return`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ticket ${a.bookingRef}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #07111f; color: #eff6ff; margin: 0; padding: 24px; }
        .card { max-width: 720px; margin: 0 auto; background: rgba(10, 20, 35, 0.96); border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; padding: 28px; }
        .muted { color: #9fb4cc; }
        .title { font-size: 30px; margin: 0 0 10px; }
        .row { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 20px; }
        .pill { border: 1px solid rgba(13,242,32,0.3); color: #0df220; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
        .btn { display: inline-block; margin-top: 20px; padding: 12px 16px; background: #0df220; color: #07111f; text-decoration: none; font-weight: bold; border-radius: 999px; }
        .qr { width: 180px; height: 180px; border-radius: 18px; background: white; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="muted">FutsalGoa Ticket</div>
        <h1 class="title">${a.bookingRef}</h1>
        <div class="row">
          <div>
            <div class="muted">Name</div>
            <strong>${a.customerName}</strong>
          </div>
          <div>
            <div class="muted">Arena</div>
            <strong>${a.arenaName}</strong>
          </div>
          <div>
            <div class="muted">Date</div>
            <strong>${a.bookingDate}</strong>
          </div>
        </div>
        <div class="row">
          <div class="pill">${b.join(", ")}</div>
          <div class="pill">${(0,f.E9)(a.slots)}</div>
        </div>
        <div style="margin-top: 24px;">
          <img class="qr" src="${c}" alt="QR code ticket" />
        </div>
        <p class="muted">Ticket numbers: ${d}</p>
        <a class="btn" href="${e}">Download ticket</a>
      </div>
    </body>
  </html>`}async function j(a){let b=await (0,e.Ft)(a);if(0===b.length)return null;let c=await (0,e.oe)(b[0].arena_id);return c?{bookingRef:a,arenaName:c.name,customerName:b[0].customer_name,bookingDate:b[0].booking_date,ticketNumbers:b.map(a=>a.ticket_number).filter(Boolean),slots:b.map(a=>a.time_slot)}:null}async function k(a){let b=await j(a);if(!b)return{sent:!1,reason:"Ticket not found"};let c=(await (0,e.Ft)(a))[0].customer_email;if(!c)return{sent:!1,reason:"No recipient email"};let d=i(b),f=`Your FutsalGoa ticket ${a}`;return console.info(`[TICKET EMAIL LOG] To: ${c}
Subject: ${f}
${d}`),{sent:!0,mode:"log"}}e=(g.then?(await g)():g)[0],d()}catch(a){d(a)}})},27143:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.d(b,{P:()=>i,Rn:()=>k,Zy:()=>j});var e=c(64939),f=a([e]);function g(a){let b=0;return a.replace(/\?/g,()=>`$${++b}`)}function h(){return globalThis.pgPool||(globalThis.pgPool=new e.Pool(function(){let a=process.env.DATABASE_URL;return a?{connectionString:a,max:10}:{host:process.env.DB_HOST??"127.0.0.1",port:Number(process.env.DB_PORT??"5432"),user:process.env.DB_USERNAME??"postgres",password:process.env.DB_PASSWORD??"postgres",database:process.env.DB_DATABASE??"futsal_laravel",max:10}}())),globalThis.pgPool}async function i(a,b=[]){return(await h().query(g(a),b)).rows}async function j(a,b=[]){return(await i(a,b))[0]??null}async function k(a){let b=await h().connect();try{await b.query("BEGIN");let c=await a({execute:async(a,c=[])=>[(await b.query(g(a),c)).rows]});return await b.query("COMMIT"),c}catch(a){throw await b.query("ROLLBACK"),a}finally{b.release()}}e=(f.then?(await f)():f)[0],d()}catch(a){d(a)}})},64240:(a,b,c)=>{function d(a){let[b]=a.split("-");return b}function e(a){let[b,c]=a.split(":").map(Number);return 60*b+c}function f(a){let b=[...a].sort((a,b)=>e(d(a))-e(d(b))),c=[];for(let a of b){if(0===c.length){c.push(a);continue}let[b,d]=c[c.length-1].split("-"),[e,f]=a.split("-");d===e?c[c.length-1]=`${b}-${f}`:c.push(a)}return c}function g(a){if(0===a.length)return"0 hrs";let b=a[0].split("-")[0],c=(e(a[a.length-1].split("-")[1])-e(b))/60;return`${c} hr${1===c?"":"s"}`}c.d(b,{E9:()=>g,WC:()=>f})},85509:(a,b,c)=>{c.a(a,async(a,d)=>{try{c.d(b,{DO:()=>B,F4:()=>p,Ft:()=>o,Km:()=>t,Mi:()=>D,P:()=>H,PH:()=>F,PL:()=>z,RY:()=>C,Rd:()=>u,Rn:()=>i.Rn,So:()=>n,To:()=>x,XA:()=>y,XO:()=>A,Zy:()=>i.Zy,a4:()=>w,i1:()=>s,j6:()=>q,kR:()=>r,n:()=>E,oe:()=>m,q4:()=>l,tk:()=>k,wU:()=>v,yc:()=>G});var e=c(87082),f=c.n(e),g=c(77598),h=c.n(g),i=c(27143),j=a([i]);let H=(i=(j.then?(await j)():j)[0]).P;async function k(){return(await (0,i.P)(`SELECT a.id, a.name, a.slug, a.address, a.description, a.cover_image, a.status,
            COALESCE(MIN(p.price), 500) AS min_price,
            a.bot_enabled, a.gmaps_link
       FROM arenas a
       LEFT JOIN pricings p ON p.arena_id = a.id
      WHERE a.status = 'active'
   GROUP BY a.id, a.name, a.slug, a.address, a.description, a.cover_image, a.status, a.bot_enabled, a.gmaps_link
   ORDER BY a.name ASC`)).map(a=>({...a,min_price:Number(a.min_price??500)}))}async function l(a){return(0,i.Zy)("SELECT * FROM arenas WHERE slug = ? LIMIT 1",[a])}async function m(a){return(0,i.Zy)("SELECT * FROM arenas WHERE id = ? LIMIT 1",[a])}async function n(a){return(0,i.P)("SELECT * FROM pricings WHERE arena_id = ? ORDER BY time_slot ASC",[a])}async function o(a){return(0,i.P)("SELECT * FROM bookings WHERE booking_ref = ? ORDER BY time_slot ASC",[a])}async function p(a){return(0,i.P)("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC",[a])}async function q(a){return(0,i.Zy)("SELECT * FROM bookings WHERE ticket_number = ? LIMIT 1",[a])}async function r(a,b){return(await (0,i.P)(`SELECT time_slot FROM bookings
      WHERE arena_id = ?
        AND booking_date = ?
        AND payment_status IN ('pending', 'confirmed')`,[a,b])).map(a=>a.time_slot)}async function s(a,b,c){return(await (0,i.P)(`SELECT time_slot FROM slot_locks
      WHERE arena_id = ?
        AND booking_date = ?
        AND expires_at > NOW()
        ${c?"AND session_id != ?":""}`,c?[a,b,c]:[a,b])).map(a=>a.time_slot)}async function t(a,b,c){return(await (0,i.P)(`SELECT time_slot FROM slot_locks
      WHERE arena_id = ?
        AND booking_date = ?
        AND session_id = ?
        AND expires_at > NOW()`,[a,b,c])).map(a=>a.time_slot)}async function u(a,b,c,d){let e=new Date(Date.now()+6e5),f=[],g=[];return await (0,i.Rn)(async h=>{for(let i of c){let[c]=await h.execute(`SELECT id FROM bookings
          WHERE arena_id = ?
            AND booking_date = ?
            AND time_slot = ?
            AND payment_status IN ('pending', 'confirmed')
          LIMIT 1 FOR UPDATE`,[a,b,i]);if(c.length>0){g.push(i);continue}let[j]=await h.execute(`SELECT * FROM slot_locks
          WHERE arena_id = ?
            AND booking_date = ?
            AND time_slot = ?
          LIMIT 1 FOR UPDATE`,[a,b,i]),k=j[0];if(k&&k.session_id!==d&&new Date(k.expires_at)>new Date){g.push(i);continue}k?await h.execute(`UPDATE slot_locks
              SET session_id = ?, locked_at = NOW(), expires_at = ?
            WHERE id = ?`,[d,e,k.id]):await h.execute(`INSERT INTO slot_locks (arena_id, booking_date, time_slot, session_id, locked_at, expires_at)
           VALUES (?, ?, ?, ?, NOW(), ?)`,[a,b,i,d,e]),f.push(i)}}),{locked:f,failed:g}}async function v(a,b,c,d){let e=["session_id = ?"],f=[a];b&&(e.push("arena_id = ?"),f.push(b)),c&&(e.push("booking_date = ?"),f.push(c)),d&&d.length>0&&(e.push(`time_slot IN (${d.map(()=>"?").join(", ")})`),f.push(...d)),await H(`DELETE FROM slot_locks WHERE ${e.join(" AND ")}`,f)}async function w(a){let b=`REF-${h().randomUUID().slice(0,8).toUpperCase()}`,c=await n(a.arenaId),d=new Map(c.map(a=>[a.time_slot,Number(a.price)])),e=[],f=a.userId;return await (0,i.Rn)(async c=>{if(!f){let[b]=await c.execute("SELECT id FROM users WHERE customer_mobile = ? OR email = ? LIMIT 1",[a.customerMobile,a.customerEmail||"no-email@futsalgoa.com"]),d=b[0];if(d)f=d.id;else{let[b]=await c.execute(`INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at)
           VALUES (?, ?, ?, 'customer', NOW(), NOW())
           RETURNING id`,[a.customerName,a.customerEmail||`user-${h().randomUUID().slice(0,8)}@futsalgoa.com`,a.customerMobile]);f=b[0].id}}for(let g of a.slots){let i=a.freeBooking?0:d.get(g);if(null==i)throw Error(`Pricing not found for slot ${g}`);let[j]=await c.execute(`SELECT id FROM bookings
          WHERE arena_id = ?
            AND booking_date = ?
            AND time_slot = ?
            AND payment_status IN ('pending', 'confirmed')
          LIMIT 1 FOR UPDATE`,[a.arenaId,a.bookingDate,g]);if(j.length>0)throw Error(`Slot ${g} has already been booked.`);let k=`TKT-${new Date().toISOString().slice(2,10).replaceAll("-","")}-${h().randomUUID().slice(0,4).toUpperCase()}`;await c.execute(`INSERT INTO bookings (
          ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
          customer_name, customer_mobile, customer_email, amount, payment_status,
          payment_method, notes, checked_in, is_free_booking, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, FALSE, ?, NOW(), NOW())`,[k,b,a.arenaId,f,a.bookingDate,g,a.customerName,a.customerMobile,a.customerEmail,i,a.freeBooking?"confirmed":"pending",a.freeBooking?"free":"online",!!a.freeBooking]),e.push({booking_ref:b,ticket_number:k,time_slot:g,amount:i})}await c.execute("DELETE FROM slot_locks WHERE session_id = ? AND arena_id = ? AND booking_date = ?",[a.sessionId,a.arenaId,a.bookingDate])}),{bookingRef:b,created:e,userId:f}}async function x(a,b){let c=await o(a);return 0===c.length?null:(await (0,i.Rn)(async c=>{await c.execute(`UPDATE bookings
          SET payment_status = 'confirmed', payu_mihpayid = ?, updated_at = NOW()
        WHERE booking_ref = ?`,[b,a])}),c[0])}async function y(a){await H("UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE booking_ref = ?",[a])}async function z(a){return(0,i.Zy)('SELECT "key", value FROM settings WHERE "key" = ? LIMIT 1',[a])}async function A(a,b=!0){let c=await z(a);return c?.value?"true"===c.value:b}async function B(a,b){let c=await f().hash(b,10);await H(`INSERT INTO user_otps (identifier, otp, expires_at, created_at, updated_at)
     VALUES (?, ?, NOW() + INTERVAL '10 minutes', NOW(), NOW())
     ON CONFLICT (identifier)
     DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,[a,c])}async function C(a,b){let c=await (0,i.Zy)("SELECT * FROM user_otps WHERE identifier = ? LIMIT 1",[a]);return!(!c||new Date(c.expires_at).getTime()<Date.now())&&f().compare(b,c.otp)}async function D(a){await H("DELETE FROM user_otps WHERE identifier = ?",[a])}async function E(a){return(0,i.Zy)(`SELECT id, name, email, customer_mobile
       FROM users
      WHERE email = ?
         OR customer_mobile = ?
      LIMIT 1`,[a,a])}async function F(a){return(0,i.P)("SELECT * FROM bookings WHERE ticket_number = ? ORDER BY booking_date DESC",[a])}async function G(a,b){let c=await F(a);return 0===c.length?{success:!1,message:"Ticket not found."}:c[0].checked_in?{success:!1,message:"Already checked in."}:(await H(`UPDATE bookings
        SET checked_in = TRUE, checked_in_at = NOW(), checked_in_by = ?, updated_at = NOW()
      WHERE ticket_number = ?`,[b,a]),{success:!0,message:"Entry confirmed."})}d()}catch(a){d(a)}})}};