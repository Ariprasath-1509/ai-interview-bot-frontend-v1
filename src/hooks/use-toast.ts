import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

interface ToastState {
  toasts: Toast[]
}

const toastState: ToastState = {
  toasts: []
}

let listeners: Array<(state: ToastState) => void> = []

function dispatch(action: { type: string; toast?: Toast; toastId?: string }) {
  switch (action.type) {
    case 'ADD_TOAST':
      if (action.toast) {
        toastState.toasts = [...toastState.toasts, action.toast]
      }
      break
    case 'REMOVE_TOAST':
      if (action.toastId) {
        toastState.toasts = toastState.toasts.filter(t => t.id !== action.toastId)
      }
      break
    case 'DISMISS_TOAST':
      if (action.toastId) {
        toastState.toasts = toastState.toasts.filter(t => t.id !== action.toastId)
      }
      break
  }
  
  listeners.forEach(listener => listener(toastState))
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ToasterToast = Toast & {
  id: string
}

const toast = ({ ...props }: Omit<ToasterToast, 'id'>) => {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = useState<ToastState>(toastState)

  useState(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  })

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }