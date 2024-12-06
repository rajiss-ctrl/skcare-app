import Footer from '@/components/Footer'
import { Outlet } from 'react-router-dom'

const Layout = () => {
  return (
    <div>
      <Outlet />
      <Footer/>
    </div>
  )
}

export default Layout
