import { json, methodOnly } from './_lib/http.js'
import { isDatabaseConfigured } from './_lib/db.js'

export default function handler(req,res) {
  if(!methodOnly(req,res,'GET')) return
  json(res,200,{ok:true,service:'question-paper-navigator-api',database_configured:isDatabaseConfigured(),email_configured:Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM),payments_configured:Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&process.env.RAZORPAY_WEBHOOK_SECRET),mode:process.env.NODE_ENV==='production'?'production':'development'})
}
