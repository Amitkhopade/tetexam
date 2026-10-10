import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Grid, Stack, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'

function money(paise,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency:currency||'INR',maximumFractionDigits:2}).format(Number(paise||0)/100)}
async function loadRazorpay(){
  if(window.Razorpay) return true
  return new Promise((resolve)=>{
    const existing=document.querySelector('script[data-qpn-razorpay]')
    if(existing){existing.addEventListener('load',()=>resolve(true),{once:true});existing.addEventListener('error',()=>resolve(false),{once:true});return}
    const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;script.dataset.qpnRazorpay='true';script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.head.appendChild(script)
  })
}

export default function PricingPage({ session=null, onNavigate=()=>{}, onPurchased=()=>{} }) {
  const [products,setProducts]=useState([]); const [configured,setConfigured]=useState(true); const [paymentEnabled,setPaymentEnabled]=useState(false); const [loading,setLoading]=useState(true); const [busyId,setBusyId]=useState(''); const [status,setStatus]=useState(null)
  useEffect(()=>{let cancelled=false;fetch('/api/billing/products',{cache:'no-store'}).then(r=>r.json()).then(body=>{if(cancelled)return;setProducts(body.products||[]);setConfigured(Boolean(body.configured));setPaymentEnabled(Boolean(body.payment_enabled));if(body.message&&!body.configured)setStatus({severity:'info',text:body.message})}).catch(()=>{if(!cancelled)setStatus({severity:'info',text:'Paid plans are not configured yet. Free mock tests remain available.'})}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[])
  async function buy(product){
    if(!session){localStorage.setItem('qpn:afterLogin','/pricing');onNavigate('/login');return}
    setBusyId(product.product_id);setStatus(null)
    try{
      const ready=await loadRazorpay();if(!ready)throw new Error('Razorpay checkout script could not be loaded. Check network/content blockers.')
      const orderResponse=await fetch('/api/payments/create-order',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:product.product_id})})
      const order=await orderResponse.json();if(!orderResponse.ok||!order.ok)throw new Error(order.message||'Could not create payment order.')
      const checkout=new window.Razorpay({key:order.key_id,amount:order.amount,currency:order.currency,name:'Question Paper Navigator',description:order.product?.name||product.name,order_id:order.order_id,prefill:{name:session.fullName||'',email:session.email||'',contact:session.mobile||''},notes:{product_id:product.product_id},theme:{color:'#2563eb'},handler:async(response)=>{
        try{const verified=await fetch('/api/payments/verify',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(response)});const result=await verified.json();if(!verified.ok||!result.ok)throw new Error(result.message||'Payment verification failed.');if(result.status==='pending'){setStatus({severity:'warning',text:result.message});return}setStatus({severity:'success',text:'Payment verified. Your purchased assessment access is now available.'});onPurchased({productId:product.product_id})}catch(err){setStatus({severity:'error',text:err.message})}
      },modal:{ondismiss:()=>setStatus({severity:'info',text:'Checkout closed. No access was granted unless the payment is verified.'})}})
      checkout.on('payment.failed',(event)=>setStatus({severity:'error',text:event?.error?.description||'Payment failed. You can try again.'}))
      checkout.open()
    }catch(error){setStatus({severity:'error',text:error.message||'Payment could not be started.'})}finally{setBusyId('')}
  }
  return <Container maxWidth="xl" sx={{py:{xs:3,md:5}}}><Stack spacing={3}>
    <Box><Typography variant="h4">Pricing & access</Typography><Typography color="text.secondary" sx={{mt:1,maxWidth:850}}>The existing H, K, L, M and N mock tests stay free. Paid assessments are separate and are available only after a verified payment creates an entitlement.</Typography></Box>
    {status&&<Alert severity={status.severity}>{status.text}</Alert>}
    <Grid container spacing={2}>
      <Grid size={{xs:12,sm:6,lg:4}}><Card sx={{height:'100%'}}><CardContent sx={{p:3,height:'100%'}}><Stack spacing={1.5} sx={{height:'100%'}}><Chip label="FREE FOREVER" color="success" sx={{alignSelf:'flex-start'}}/><Typography variant="h5">Free Mock Tests</Typography><Typography variant="h3" fontWeight={900}>₹0</Typography><Typography color="text.secondary">Practice the existing H/K/L/M/N sets without payment.</Typography><Stack spacing={.8} sx={{flex:1}}>{['All existing mock sets remain free','Timer and automatic scoring','English/Hindi where available'].map(t=><Stack direction="row" gap={1} key={t}><CheckCircleRoundedIcon color="success" fontSize="small"/><Typography variant="body2">{t}</Typography></Stack>)}</Stack><Button variant="contained" onClick={()=>onNavigate(session?'/':'/login')}>Browse free tests</Button></Stack></CardContent></Card></Grid>
      {loading&&<Grid size={{xs:12,sm:6,lg:4}}><Card><CardContent sx={{p:4,display:'grid',placeItems:'center'}}><CircularProgress/><Typography sx={{mt:2}}>Loading paid plans…</Typography></CardContent></Card></Grid>}
      {!loading&&products.map(product=><Grid key={product.product_id} size={{xs:12,sm:6,lg:4}}><Card sx={{height:'100%'}}><CardContent sx={{p:3,height:'100%'}}><Stack spacing={1.5} sx={{height:'100%'}}><Chip icon={<LockOpenRoundedIcon/>} label="PAID ASSESSMENT" color="primary" variant="outlined" sx={{alignSelf:'flex-start'}}/><Typography variant="h5">{product.name}</Typography><Typography variant="h3" fontWeight={900}>{money(product.amount_paise,product.currency)}</Typography><Typography color="text.secondary" sx={{flex:1}}>{product.description||'Access the selected paid assessment(s) after payment verification.'}</Typography><Typography variant="caption" color="text.secondary">Includes {(product.paper_ids||[]).length} assessment(s)</Typography><Button variant="contained" disabled={!paymentEnabled||busyId===product.product_id} onClick={()=>buy(product)}>{busyId===product.product_id?'Opening checkout…':session?'Buy securely':'Sign in to purchase'}</Button>{!paymentEnabled&&<Typography variant="caption" color="text.secondary">Checkout is disabled until Razorpay keys and webhook secret are configured.</Typography>}</Stack></CardContent></Card></Grid>)}
    </Grid>
    {!loading&&configured&&products.length===0&&<Alert severity="info">No paid products have been configured. An admin can add a paid assessment and price from the Admin workspace. The existing mock tests remain free.</Alert>}
  </Stack></Container>
}
