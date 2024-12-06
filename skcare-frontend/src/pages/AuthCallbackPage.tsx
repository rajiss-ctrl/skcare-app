import { useCreateMyUser } from "@/api/MyUserApi"
import { useAuth0 } from "@auth0/auth0-react"
import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const hasCreatedUser = useRef(false) // To make sure it (useEffect) fires once
  const { user } = useAuth0() // This will give us access to the current logged-in user
  const { createUser } = useCreateMyUser() // remove from Auth0ProviderWithNavigate

  useEffect(() => {
    if (user?.sub && user?.email && !hasCreatedUser.current) { // remove from Auth0ProviderWithNavigate
      createUser({ auth0Id: user.sub, email: user.email })
      hasCreatedUser.current = true
      navigate('/')
    }
  }, [createUser, navigate, user])

  return <>Loading...!</>
}

export default AuthCallbackPage
