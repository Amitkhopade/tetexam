import { Box, Container, Divider, Stack, Typography } from '@mui/material'

export default function SiteFooter() {
  return <Box component="footer" sx={{ mt: 'auto', py: 3 }}><Container maxWidth="xl"><Divider sx={{ mb: 2 }} /><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Typography variant="caption" color="text.secondary">Question Paper Navigator</Typography><Typography variant="caption" color="text.secondary">Static JSON assessment engine • no SQL</Typography></Stack></Container></Box>
}
