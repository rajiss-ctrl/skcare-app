import React from 'react'
import ProductUploadForm from '../components/UploadProduct'
import NavBar from '@/components/NavBar'

const Admin = () => {
  return (
    <div className='flex flex-col'>
      <NavBar/>
        <ProductUploadForm/> 
    </div>
  )
}

export default Admin
