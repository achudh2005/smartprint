import { useState, useCallback } from 'react'

export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }, [])

  const setFieldError = useCallback((field, msg) => {
    setErrors((prev) => ({ ...prev, [field]: msg }))
  }, [])

  const setApiErrors = useCallback((apiErrors) => {
    if (Array.isArray(apiErrors)) {
      const map = {}
      apiErrors.forEach((e) => { if (e.field) map[e.field] = e.message })
      setErrors(map)
    }
  }, [])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
  }, [initialValues])

  return { values, errors, loading, setLoading, handleChange, setFieldError, setApiErrors, reset, setValues }
}
