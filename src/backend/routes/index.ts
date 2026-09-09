import { Router } from 'express'
import { requireAuth, requirePermission } from '../middlewares/auth'
import { authController } from '../controllers/auth.controller'
import { customerController } from '../controllers/customer.controller'
import { vehicleController } from '../controllers/vehicle.controller'
import { workOrderController } from '../controllers/work-order.controller'
import {
  dashboardController,
  financeController,
  productController,
  quoteController,
  serviceCatalogController,
  settingsController,
  stockController,
} from '../controllers/misc.controller'

export const router = Router()

router.post('/auth/login', authController.login)
router.post('/auth/logout', authController.logout)
router.get('/auth/me', requireAuth, authController.me)

router.get('/customers', requireAuth, requirePermission('customers.read'), customerController.list)
router.get('/customers/:id', requireAuth, requirePermission('customers.read'), customerController.get)
router.post('/customers', requireAuth, requirePermission('customers.write'), customerController.create)
router.put('/customers/:id', requireAuth, requirePermission('customers.write'), customerController.update)
router.delete('/customers/:id', requireAuth, requirePermission('customers.delete'), customerController.remove)

router.get('/vehicles', requireAuth, requirePermission('vehicles.read'), vehicleController.list)
router.get('/vehicles/:id', requireAuth, requirePermission('vehicles.read'), vehicleController.get)
router.post('/vehicles', requireAuth, requirePermission('vehicles.write'), vehicleController.create)
router.put('/vehicles/:id', requireAuth, requirePermission('vehicles.write'), vehicleController.update)
router.delete('/vehicles/:id', requireAuth, requirePermission('vehicles.delete'), vehicleController.remove)

router.get('/work-orders', requireAuth, requirePermission('work-orders.read'), workOrderController.list)
router.get('/work-orders/:id', requireAuth, requirePermission('work-orders.read'), workOrderController.get)
router.post('/work-orders', requireAuth, requirePermission('work-orders.write'), workOrderController.create)
router.put('/work-orders/:id', requireAuth, requirePermission('work-orders.write'), workOrderController.update)
router.delete('/work-orders/:id', requireAuth, requirePermission('work-orders.delete'), workOrderController.remove)
router.post('/work-orders/:id/status', requireAuth, requirePermission('work-orders.write'), workOrderController.status)
router.post('/work-orders/:id/services', requireAuth, requirePermission('work-orders.write'), workOrderController.addService)
router.post('/work-orders/:id/parts', requireAuth, requirePermission('work-orders.write'), workOrderController.addPart)
router.delete('/work-orders/:id/services/:itemId', requireAuth, requirePermission('work-orders.write'), workOrderController.removeService)
router.delete('/work-orders/:id/parts/:itemId', requireAuth, requirePermission('work-orders.write'), workOrderController.removePart)

router.get('/products', requireAuth, requirePermission('products.read'), productController.list)
router.get('/products/:id', requireAuth, requirePermission('products.read'), productController.get)
router.post('/products', requireAuth, requirePermission('products.write'), productController.create)
router.put('/products/:id', requireAuth, requirePermission('products.write'), productController.update)
router.delete('/products/:id', requireAuth, requirePermission('products.delete'), productController.remove)

router.get('/services', requireAuth, requirePermission('products.read'), serviceCatalogController.list)
router.post('/services', requireAuth, requirePermission('products.write'), serviceCatalogController.create)
router.put('/services/:id', requireAuth, requirePermission('products.write'), serviceCatalogController.update)
router.delete('/services/:id', requireAuth, requirePermission('products.delete'), serviceCatalogController.remove)

router.post('/stock/entries', requireAuth, requirePermission('stock.write'), stockController.entry)
router.post('/stock/exits', requireAuth, requirePermission('stock.write'), stockController.exit)
router.get('/stock/movements', requireAuth, requirePermission('stock.read'), stockController.movements)

router.get('/quotes', requireAuth, requirePermission('quotes.read'), quoteController.list)
router.get('/quotes/:id', requireAuth, requirePermission('quotes.read'), quoteController.get)
router.post('/quotes', requireAuth, requirePermission('quotes.write'), quoteController.create)
router.put('/quotes/:id', requireAuth, requirePermission('quotes.write'), quoteController.update)
router.post('/quotes/:id/convert', requireAuth, requirePermission('quotes.write'), quoteController.convert)

router.get('/finance/receivables', requireAuth, requirePermission('finance.read'), financeController.receivables)
router.get('/finance/payables', requireAuth, requirePermission('finance.read'), financeController.payables)
router.post('/finance/receivables', requireAuth, requirePermission('finance.write'), financeController.createReceivable)
router.post('/finance/payables', requireAuth, requirePermission('finance.write'), financeController.createPayable)
router.put('/finance/receivables/:id', requireAuth, requirePermission('finance.write'), financeController.updateReceivable)
router.put('/finance/payables/:id', requireAuth, requirePermission('finance.write'), financeController.updatePayable)
router.post('/finance/receivables/:id/payments', requireAuth, requirePermission('finance.write'), financeController.payReceivable)
router.post('/finance/payables/:id/payments', requireAuth, requirePermission('finance.write'), financeController.payPayable)
router.get('/finance/summary', requireAuth, requirePermission('finance.read'), financeController.summary)

router.get('/dashboard', requireAuth, requirePermission('dashboard.read'), dashboardController.get)

router.get('/settings', requireAuth, requirePermission('settings.read'), settingsController.get)
router.put('/settings', requireAuth, requirePermission('settings.write'), settingsController.update)
router.post('/settings/backup', requireAuth, requirePermission('backup.write'), settingsController.backup)
router.post('/settings/restore', requireAuth, requirePermission('backup.write'), settingsController.restore)
