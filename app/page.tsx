"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Plus,
  Minus,
  Sun,
  Moon,
  RotateCcw,
  Star,
  ZoomIn,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Mail,
  Package,
  Truck,
  CheckCircle,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

interface Product {
  id: number
  name: string
  price: number
  images: {
    front: string
    back: string
  }
  description: string
  composition: string
  sizes: string[]
}

interface CartItem {
  product: Product
  size: string
  quantity: number
}

interface OrderForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  address: string
  apartment: string
  postalCode: string
  comments: string
}

const kazakhstanCities = [
  "Астана",
  "Алматы",
  "Шымкент",
  "Караганда",
  "Актобе",
  "Тараз",
  "Павлодар",
  "Усть-Каменогорск",
  "Семей",
  "Атырау",
  "Костанай",
  "Кызылорда",
  "Уральск",
  "Петропавловск",
  "Актау",
  "Темиртау",
  "Туркестан",
  "Кокшетау",
  "Талдыкорган",
  "Экибастуз",
]

export default function FashionStore() {
  const [currentPage, setCurrentPage] = useState<"home" | "product" | "checkout">("home")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [currentView, setCurrentView] = useState<"front" | "back">("front")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [orderForm, setOrderForm] = useState<OrderForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    apartment: "",
    postalCode: "",
    comments: "",
  })

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "light") {
      setIsDarkMode(false)
    }

    // Load cart from localStorage
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  // Save theme preference and apply to document
  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light")
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart))
  }, [cart])

  const product: Product = {
    id: 1,
    name: "ОТРОДЬЕ ДЕНЬГИ",
    price: 16000,
    images: {
      front: "/tshirt-front.png",
      back: "/tshirt-back.png",
    },
    description: "“ОТРОДЬЕ ДЕНЬГИ” tee",
    composition: "100% ХЛОПОК ПРЕМИУМ\nПЕЧАТЬ: цифровая прямая печать (DTG)",
    sizes: ["S", "M", "L", "XL", "XXL"],
  }

  const fadeInUp = {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: [0.6, -0.05, 0.01, 0.99] },
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const handleProductClick = () => {
    setSelectedProduct(product)
    setCurrentPage("product")
    setSelectedSize("")
    setQuantity(1)
    setCurrentView("front")
  }

  const handleBackToHome = () => {
    setCurrentPage("home")
    setSelectedProduct(null)
    setIsZoomed(false)
  }

  const handleAddToCart = () => {
    if (selectedSize && selectedProduct) {
      const existingItem = cart.find((item) => item.product.id === selectedProduct.id && item.size === selectedSize)

      if (existingItem) {
        setCart(
          cart.map((item) =>
            item.product.id === selectedProduct.id && item.size === selectedSize
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        )
      } else {
        setCart([...cart, { product: selectedProduct, size: selectedSize, quantity }])
      }

      // Show success animation
      const button = document.querySelector("[data-add-to-cart]")
      if (button) {
        button.classList.add("animate-pulse")
        setTimeout(() => button.classList.remove("animate-pulse"), 1000)
      }
    }
  }

  const handleCheckout = () => {
    setCurrentPage("checkout")
  }

  // Заменить всю функцию на это
const handleOrderSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // 1) Подготовим данные заказа (как у тебя и было)
  const orderData = {
    items: cart,
    customer: orderForm,
    total: getTotalPrice() + shippingCost(),
    shippingCost: shippingCost(),
  }

  try {
    // 2) Отправляем на наш API
    const res = await fetch("/api/telegram/send-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    })
    const data = await res.json()

    if (!res.ok || !data?.success || !data?.botLink) {
      throw new Error(data?.error || "Не удалось получить ссылку на бота")
    }

    // 3) Покажем экран успеха (как было)
    setShowOrderSuccess(true)

    // 4) Через 3 секунды чистим состояние и ОТКРЫВАЕМ ИМЕННО botLink
    setTimeout(() => {
      setCart([])
      setOrderForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        address: "",
        apartment: "",
        postalCode: "",
        comments: "",
      })
      setShowOrderSuccess(false)
      setCurrentPage("home")

      // ВАЖНО: больше НЕ "https://t.me/OtrodyaBot", а ссылка из ответа
      window.open(data.botLink, "_blank")
    }, 3000)
  } catch (error) {
    console.error("Error sending order to Telegram:", error)
    alert("Ошибка оформления заказа. Попробуйте ещё раз.")
  }
}


  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const toggleView = () => {
    setCurrentView(currentView === "front" ? "back" : "front")
    setIsZoomed(false)
    setZoomPosition({ x: 0, y: 0 })
  }

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x, y })
  }

  const scrollToProducts = () => {
    const productsSection = document.getElementById("products")
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  function shippingCost() {
    if (!orderForm.city) return 0
    const normalized = orderForm.city.toLowerCase()
    return normalized.includes("астан") ? 0 : 1200
  }

  // Custom SVG components (same as before)
  const ThickPlusIcon = ({
    className,
    fill = "currentColor",
    stroke = "none",
  }: { className?: string; fill?: string; stroke?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="0">
      <path d="M20,9h-5V4c0-1.7-1.3-3-3-3s-3,1.3-3,3v5H4c-1.7,0-3,1.3-3,3s1.3,3,3,3h5v5c0,1.7,1.3,3,3,3s3-1.3,3-3v-5h5 c1.7,0,3-1.3,3-3S21.7,9,20,9z" />
    </svg>
  )

  const OutlinePlusIcon = ({ className, stroke = "currentColor" }: { className?: string; stroke?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )

  const FilledStarIcon = ({ className, fill = "currentColor" }: { className?: string; fill?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill={fill}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  const OutlineStarIcon = ({ className, stroke = "currentColor" }: { className?: string; stroke?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  const FilledHeartIcon = ({ className, fill = "currentColor" }: { className?: string; fill?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill={fill}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )

  const OutlineHeartIcon = ({ className, stroke = "currentColor" }: { className?: string; stroke?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}
    >
      {/* Header */}
      <motion.header
        className={`grid grid-cols-2 md:grid-cols-3 items-center px-4 md:px-8 py-4 md:py-6 backdrop-blur-sm fixed w-full z-50 border-b transition-colors duration-500 ${
          isDarkMode ? "bg-black/90 border-white/20" : "bg-white/90 border-black/20"
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Left Navigation */}
        <nav className="flex items-center space-x-4 md:space-x-12 justify-start">
          {currentPage !== "home" ? (
            <motion.button
              onClick={handleBackToHome}
              className={`flex items-center space-x-2 md:space-x-3 text-sm md:text-lg font-bold tracking-wider transition-colors ${
                isDarkMode ? "text-white hover:text-gray-300" : "text-black hover:text-gray-700"
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ x: -8 }}
            >
              <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
              <span className="hidden sm:inline">НАЗАД</span>
            </motion.button>
          ) : (
            <></>
          )}
        </nav>

        {/* Center Logo */}
        <motion.div
          className="flex justify-center md:justify-center col-span-2 md:col-span-1 order-first md:order-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <button onClick={handleBackToHome}>
            <h1
              className={`text-xl md:text-3xl font-black tracking-[0.2em] md:tracking-[0.4em] transition-colors ${
                isDarkMode ? "text-white" : "text-black"
              }`}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              OTRODYA
            </h1>
          </button>
        </motion.div>

        {/* Right Navigation */}
        <div className="flex items-center justify-end space-x-2 md:space-x-4">
          {/* Cart Button */}
          {cart.length > 0 && currentPage !== "checkout" && (
            <motion.button
              onClick={handleCheckout}
              className={`relative p-2 md:p-3 rounded-full transition-all duration-300 ${
                isDarkMode
                  ? "text-white hover:text-gray-300 hover:bg-white/10"
                  : "text-black hover:text-gray-700 hover:bg-black/10"
              }`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -3, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
              <motion.span
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center font-bold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={getCartItemsCount()}
              >
                {getCartItemsCount()}
              </motion.span>
            </motion.button>
          )}

          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            className={`p-2 md:p-3 rounded-full transition-all duration-300 ${
              isDarkMode
                ? "text-white hover:text-gray-300 hover:bg-white/10"
                : "text-black hover:text-gray-700 hover:bg-black/10"
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -3, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {isDarkMode ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Sun className="w-5 h-5 md:w-6 md:h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Moon className="w-5 h-5 md:w-6 md:h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.header>

      {/* Order Success Modal */}
      <AnimatePresence>
        {showOrderSuccess && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`p-12 rounded-2xl text-center max-w-md mx-4 ${
                isDarkMode ? "bg-neutral-900 text-white" : "bg-white text-black"
              }`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              </motion.div>
              <h3 className="text-3xl font-black tracking-wider mb-4">ЗАКАЗ ОФОРМЛЕН!</h3>
              <p className={`text-lg mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Спасибо за покупку! Сейчас вы будете перенаправлены в наш Telegram бот для подтверждения заказа.
              </p>
              <p className={`text-sm mb-6 font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>@OtrodyaBot</p>
              <motion.div
                className="flex justify-center space-x-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Star className="w-6 h-6 text-yellow-500" />
                <Star className="w-6 h-6 text-yellow-500" />
                <Star className="w-6 h-6 text-yellow-500" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {currentPage === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Hero Section - same as before */}
            <section className="relative h-screen overflow-hidden flex items-center justify-center">
              {/* Abstract Background */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 2, ease: [0.6, -0.05, 0.01, 0.99] }}
              >
                <div className={`absolute inset-0 ${isDarkMode ? "bg-black" : "bg-white"}`} />

                {/* Abstract Background with Stars, Hearts, and Plus icons */}
                <div className="absolute inset-0 overflow-hidden hidden sm:block">
                  {/* Large flowing gradient shapes */}
                  <motion.div
                    className="absolute w-96 h-96 rounded-full"
                    style={{
                      background: isDarkMode
                        ? "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)"
                        : "radial-gradient(circle, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)",
                      top: "10%",
                      left: "10%",
                      filter: "blur(40px)",
                    }}
                    animate={{
                      x: [0, 100, -50, 0],
                      y: [0, -80, 60, 0],
                      scale: [1, 1.3, 0.8, 1],
                    }}
                    transition={{
                      duration: 25,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />

                  <motion.div
                    className="absolute w-80 h-80 rounded-full"
                    style={{
                      background: isDarkMode
                        ? "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)"
                        : "radial-gradient(circle, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.03) 50%, transparent 100%)",
                      bottom: "15%",
                      right: "15%",
                      filter: "blur(35px)",
                    }}
                    animate={{
                      x: [0, -120, 80, 0],
                      y: [0, 90, -70, 0],
                      scale: [1, 0.7, 1.4, 1],
                    }}
                    transition={{
                      duration: 30,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 2,
                    }}
                  />

                  {/* Filled Stars with varying blur */}
                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "20%",
                      left: "25%",
                      filter: "blur(4px)",
                      opacity: 0.4,
                    }}
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.3, 1],
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <FilledStarIcon className="w-20 h-20" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      bottom: "30%",
                      right: "20%",
                      filter: "blur(4px)",
                      opacity: 0.3,
                    }}
                    animate={{
                      rotate: [0, -360],
                      scale: [1, 1.4, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 25,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 3,
                    }}
                  >
                    <FilledStarIcon className="w-24 h-24" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "70%",
                      right: "35%",
                      filter: "blur(4px)",
                      opacity: 0.5,
                    }}
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.7, 0.5],
                    }}
                    transition={{
                      duration: 18,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  >
                    <FilledStarIcon className="w-16 h-16" />
                  </motion.div>

                  {/* Outline Stars with varying blur */}
                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "60%",
                      left: "15%",
                      filter: "blur(4px)",
                      opacity: 0.25,
                    }}
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1],
                      y: [0, -20, 0],
                      opacity: [0.25, 0.4, 0.25],
                    }}
                    transition={{
                      duration: 30,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 5,
                    }}
                  >
                    <OutlineStarIcon className="w-28 h-28" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "15%",
                      right: "10%",
                      filter: "blur(4px)",
                      opacity: 0.4,
                    }}
                    animate={{
                      rotate: [0, -360],
                      scale: [1, 1.3, 1],
                      x: [0, -15, 0],
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      duration: 22,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 2,
                    }}
                  >
                    <OutlineStarIcon className="w-22 h-22" />
                  </motion.div>

                  {/* Filled Hearts with varying blur */}
                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "40%",
                      right: "30%",
                      filter: "blur(4px)",
                      opacity: 0.35,
                    }}
                    animate={{
                      scale: [1, 1.3, 1],
                      rotate: [0, 10, -10, 0],
                      opacity: [0.35, 0.55, 0.35],
                    }}
                    transition={{
                      duration: 18,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <FilledHeartIcon className="w-22 h-22" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      bottom: "45%",
                      left: "35%",
                      filter: "blur(4px)",
                      opacity: 0.45,
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      y: [0, -15, 0],
                      opacity: [0.45, 0.65, 0.45],
                    }}
                    transition={{
                      duration: 16,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 3,
                    }}
                  >
                    <FilledHeartIcon className="w-18 h-18" />
                  </motion.div>

                  {/* Outline Hearts with varying blur */}
                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      bottom: "20%",
                      left: "40%",
                      filter: "blur(4px)",
                      opacity: 0.25,
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      x: [0, 15, 0],
                      opacity: [0.25, 0.4, 0.25],
                    }}
                    transition={{
                      duration: 22,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 4,
                    }}
                  >
                    <OutlineHeartIcon className="w-26 h-26" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "25%",
                      left: "50%",
                      filter: "blur(4px)",
                      opacity: 0.4,
                    }}
                    animate={{
                      scale: [1, 1.4, 1],
                      rotate: [0, -15, 15, 0],
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  >
                    <OutlineHeartIcon className="w-20 h-20" />
                  </motion.div>

                  {/* Thick Plus icons with varying blur */}
                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "30%",
                      left: "60%",
                      filter: "blur(4px)",
                      opacity: 0.3,
                    }}
                    animate={{
                      rotate: [0, 90, 180, 270, 360],
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 28,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <ThickPlusIcon className="w-20 h-20" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      bottom: "35%",
                      right: "45%",
                      filter: "blur(4px)",
                      opacity: 0.5,
                    }}
                    animate={{
                      rotate: [0, -180, -360],
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0.7, 0.5],
                    }}
                    transition={{
                      duration: 24,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 2,
                    }}
                  >
                    <ThickPlusIcon className="w-18 h-18" />
                  </motion.div>

                  {/* Outline Plus icons with varying blur */}
                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      bottom: "50%",
                      right: "10%",
                      filter: "blur(4px)",
                      opacity: 0.35,
                    }}
                    animate={{
                      rotate: [0, 180, 360],
                      scale: [1, 1.3, 1],
                      y: [0, -25, 0],
                      opacity: [0.35, 0.55, 0.35],
                    }}
                    transition={{
                      duration: 24,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 2,
                    }}
                  >
                    <OutlinePlusIcon className="w-24 h-24" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "50%",
                      left: "8%",
                      filter: "blur(4px)",
                      opacity: 0.25,
                    }}
                    animate={{
                      rotate: [0, 45, 90, 135, 180, 225, 270, 315, 360],
                      scale: [1, 1.2, 1],
                      x: [0, 20, 0],
                      opacity: [0.25, 0.45, 0.25],
                    }}
                    transition={{
                      duration: 26,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                      delay: 1,
                    }}
                  >
                    <OutlinePlusIcon className="w-26 h-26" />
                  </motion.div>

                  {/* Additional smaller elements */}
                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      top: "80%",
                      left: "20%",
                      filter: "blur(4px)",
                      opacity: 0.4,
                    }}
                    animate={{
                      scale: [1, 1.5, 1],
                      rotate: [0, 360],
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      duration: 14,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 4,
                    }}
                  >
                    <FilledStarIcon className="w-14 h-14" />
                  </motion.div>

                  <motion.div
                    className={`absolute ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      bottom: "60%",
                      right: "50%",
                      filter: "blur(4px)",
                      opacity: 0.3,
                    }}
                    animate={{
                      scale: [1, 1.3, 1],
                      y: [0, -20, 0],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 19,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: 2.5,
                    }}
                  >
                    <OutlineHeartIcon className="w-16 h-16" />
                  </motion.div>

                  {/* Flowing lines */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: isDarkMode
                        ? `linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.02) 50%, transparent 70%)`
                        : `linear-gradient(45deg, transparent 30%, rgba(0,0,0,0.02) 50%, transparent 70%)`,
                    }}
                    animate={{
                      backgroundPosition: ["0% 0%", "100% 100%"],
                    }}
                    transition={{
                      duration: 40,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />

                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: isDarkMode
                        ? `linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)`
                        : `linear-gradient(-45deg, transparent 40%, rgba(0,0,0,0.03) 50%, transparent 60%)`,
                    }}
                    animate={{
                      backgroundPosition: ["0% 100%", "100% 0%"],
                    }}
                    transition={{
                      duration: 35,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                      delay: 5,
                    }}
                  />
                </div>

                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 ${isDarkMode ? "bg-gradient-to-b from-black/60 via-black/40 to-black/60" : "bg-gradient-to-b from-white/60 via-white/40 to-white/60"}`}
                />
              </motion.div>

              <div className="relative z-10 text-center">
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-12">
                  {/* Main Title */}
                  <motion.h2
                    variants={fadeInUp}
                    className={`text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-wider leading-none relative ${isDarkMode ? "text-white" : "text-black"}`}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      textShadow: isDarkMode ? "0 0 80px rgba(255,255,255,0.4)" : "0 0 80px rgba(0,0,0,0.4)",
                    }}
                  >
                    ОТРОДЬЕ
                    {/* Dynamic background effect */}
                    <motion.div
                      className="absolute inset-0 -z-10"
                      style={{
                        background: isDarkMode
                          ? "radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%)"
                          : "radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, transparent 70%)",
                        filter: "blur(30px)",
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  </motion.h2>

                  {/* Subtitle */}
                  <motion.div
                    variants={fadeInUp}
                    className={`text-sm sm:text-lg md:text-xl tracking-[0.2em] md:tracking-[0.4em] font-light ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    STREETWEAR COLLECTION
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div variants={fadeInUp} className="pt-8">
                    <Button
                      onClick={scrollToProducts}
                      className={`transition-all duration-500 px-6 md:px-12 py-4 md:py-6 text-sm md:text-lg font-black tracking-wider rounded-none border-2 ${
                        isDarkMode
                          ? "bg-transparent border-white text-white hover:bg-white hover:text-black"
                          : "bg-transparent border-black text-black hover:bg-black hover:text-white"
                      }`}
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="hidden sm:inline">СМОТРЕТЬ КОЛЛЕКЦИЮ</span>
                      <span className="sm:hidden">КОЛЛЕКЦИЯ</span>
                    </Button>
                  </motion.div>
                </motion.div>
              </div>

              {/* Animated corner elements */}
              <motion.div
                className={`absolute top-20 left-20 w-4 h-4 ${isDarkMode ? "bg-white" : "bg-black"} hidden sm:block`}
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              />
              <motion.div
                className={`absolute bottom-20 right-20 w-6 h-6 ${isDarkMode ? "bg-white" : "bg-black"} hidden sm:block`}
                style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
                animate={{
                  rotate: [0, -360],
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            </section>

            {/* Products Section */}
            <section
              id="products"
              className={`py-8 md:py-24 px-4 md:px-8 ${isDarkMode ? "bg-neutral-950" : "bg-neutral-50"}`}
            >
              <motion.div
                className="max-w-6xl mx-auto"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className="text-center mb-20">
                  <motion.h3
                    className={`text-3xl sm:text-4xl md:text-6xl font-black tracking-wider mb-6 md:mb-8 ${isDarkMode ? "text-white" : "text-black"}`}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                  >
                    НОВАЯ КОЛЛЕКЦИЯ
                  </motion.h3>
                  <motion.p
                    className={`text-sm sm:text-lg md:text-xl tracking-wider font-light ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    ЭКСКЛЮЗИВНЫЕ ДИЗАЙНЫ ДЛЯ ТЕХ, КТО НЕ БОИТСЯ ВЫДЕЛЯТЬСЯ
                  </motion.p>
                </div>

                {/* Product Card */}
                <motion.div
                  className="max-w-4xl mx-auto"
                  initial={{ opacity: 0, y: 80 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <motion.div
                    className="cursor-pointer group"
                    onClick={handleProductClick}
                    whileHover={{ y: -15, scale: 1.02 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div
                      className={`relative overflow-hidden aspect-square mb-12 transition-all duration-500 rounded-2xl ${
                        isDarkMode ? "bg-neutral-900" : "bg-white"
                      }`}
                      style={{
                        boxShadow: isDarkMode
                          ? "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
                          : "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                      }}
                    >
                      <Image
                        src={product.images.front || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-contain p-8 md:p-10 group-hover:scale-110 transition-transform duration-700"
                      />

                      {/* Hover Effects */}
                      <motion.div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl ${
                          isDarkMode ? "bg-white/5" : "bg-black/5"
                        }`}
                      />

                      {/* Hover Text */}
                      <motion.div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div
                          className={`px-8 py-4 font-black tracking-wider text-lg border-2 backdrop-blur-sm rounded-lg ${
                            isDarkMode ? "bg-black/80 text-white border-white" : "bg-white/80 text-black border-black"
                          }`}
                        >
                          СМОТРЕТЬ ДЕТАЛИ
                        </div>
                      </motion.div>

                      {/* Corner decorations */}
                      <Star
                        className={`absolute top-4 left-4 w-6 h-6 ${isDarkMode ? "text-white" : "text-black"} opacity-60`}
                      />
                      <Star
                        className={`absolute bottom-4 right-4 w-6 h-6 ${isDarkMode ? "text-white" : "text-black"} opacity-60`}
                      />

                      {/* Subtle glow effect */}
                      <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: isDarkMode
                            ? "radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)"
                            : "radial-gradient(circle at center, rgba(0,0,0,0.05) 0%, transparent 70%)",
                          filter: "blur(20px)",
                        }}
                      />
                    </div>

                    <div className="text-center space-y-4 md:space-y-6">
                      <h4
                        className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-wider ${isDarkMode ? "text-white" : "text-black"}`}
                      >
                        {product.name}
                      </h4>
                      <p
                        className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                      >
                        ₸{product.price.toLocaleString()}
                      </p>
                      <p
                        className={`text-sm sm:text-base md:text-lg tracking-wide max-w-2xl mx-auto font-light ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {product.description}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </section>
          </motion.div>
        ) : currentPage === "product" ? (
          <motion.div
            key="product"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pt-24"
          >
            {/* Product Detail Page */}
            <div className="max-w-7xl mx-auto px-8 py-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                {/* Product Images */}
                <motion.div
                  className="space-y-8"
                  initial={{ opacity: 0, x: -80 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1 }}
                >
                  {/* Main Image with Zoom */}
                  <div className="relative">
                    <motion.div
                      className={`relative aspect-square overflow-hidden transition-colors duration-500 rounded-2xl cursor-crosshair ${
                        isDarkMode ? "bg-neutral-900" : "bg-white"
                      }`}
                      style={{
                        boxShadow: isDarkMode
                          ? "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
                          : "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                      }}
                      onMouseMove={handleImageMouseMove}
                      onMouseEnter={() => setIsZoomed(true)}
                      onMouseLeave={() => setIsZoomed(false)}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentView}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          className="relative w-full h-full"
                        >
                          <Image
                            src={product.images[currentView] || "/placeholder.svg"}
                            alt={`${product.name} - ${currentView === "front" ? "ПЕРЕД" : "ЗАД"}`}
                            fill
                            className={`object-contain p-4 sm:p-6 md:p-8 transition-transform duration-300 ${isZoomed ? "scale-150" : "scale-100"}`}
                            style={{
                              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                            }}
                          />
                        </motion.div>
                      </AnimatePresence>

                      {/* Zoom overlay */}
                      {isZoomed && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div
                            className={`absolute w-32 h-32 border-2 rounded-full ${
                              isDarkMode ? "border-white/50" : "border-black/50"
                            }`}
                            style={{
                              left: `${zoomPosition.x}%`,
                              top: `${zoomPosition.y}%`,
                              transform: "translate(-50%, -50%)",
                              background: isDarkMode
                                ? "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)"
                                : "radial-gradient(circle, rgba(0,0,0,0.1) 0%, transparent 70%)",
                            }}
                          />
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Zoom Instructions */}
                    <motion.div
                      className={`absolute top-6 left-6 px-4 py-2 font-bold tracking-wider rounded-lg backdrop-blur-sm flex items-center space-x-2 ${
                        isDarkMode ? "bg-black/80 text-white" : "bg-white/80 text-black"
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span className="text-sm">НАВЕДИТЕ ДЛЯ УВЕЛИЧЕНИЯ</span>
                    </motion.div>

                    {/* View Toggle Button */}
                    <motion.button
                      onClick={toggleView}
                      className={`absolute top-6 right-6 p-4 transition-all duration-300 border-2 rounded-lg backdrop-blur-sm ${
                        isDarkMode
                          ? "bg-black/80 text-white border-white hover:bg-white hover:text-black"
                          : "bg-white/80 text-black border-black hover:bg-black hover:text-white"
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <RotateCcw className="w-6 h-6" />
                    </motion.button>

                    {/* View Indicator */}
                    <motion.div
                      className={`absolute bottom-6 left-6 px-4 py-2 font-black tracking-wider rounded-lg backdrop-blur-sm ${
                        isDarkMode ? "bg-black/80 text-white" : "bg-white/80 text-black"
                      }`}
                      key={currentView}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {currentView === "front" ? "ПЕРЕД" : "ЗАД"}
                    </motion.div>

                    {/* Decorative stars */}
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    >
                      <Star
                        className={`absolute bottom-6 right-6 w-8 h-8 ${isDarkMode ? "text-white" : "text-black"} opacity-60`}
                      />
                    </motion.div>
                  </div>

                  {/* Thumbnail Navigation */}
                  <div className="flex space-x-6">
                    {(["front", "back"] as const).map((view) => (
                      <motion.button
                        key={view}
                        onClick={() => setCurrentView(view)}
                        className={`relative aspect-square w-28 md:w-32 overflow-hidden transition-all duration-300 border-2 rounded-lg ${
                          currentView === view
                            ? isDarkMode
                              ? "border-white"
                              : "border-black"
                            : "border-transparent opacity-60 hover:opacity-100"
                        } ${isDarkMode ? "bg-neutral-900" : "bg-white"}`}
                        style={{
                          boxShadow: isDarkMode
                            ? "0 10px 25px -5px rgba(0, 0, 0, 0.6)"
                            : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Image
                          src={product.images[view] || "/placeholder.svg"}
                          alt={`${product.name} - ${view === "front" ? "ПЕРЕД" : "ЗАД"}`}
                          fill
                          className="object-contain p-2 md:p-3"
                        />
                        {currentView === view && (
                          <motion.div
                            className="absolute inset-0 border-2 border-current rounded-lg"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Product Info */}
                <motion.div
                  className="lg:pl-16"
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <div className="sticky top-32 space-y-10">
                    <div>
                      <motion.h1
                        className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-wider mb-4 md:mb-6 ${isDarkMode ? "text-white" : "text-black"}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        {product.name}
                      </motion.h1>
                      <motion.p
                        className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-6 md:mb-8 ${isDarkMode ? "text-white" : "text-black"}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        ₸{product.price.toLocaleString()}
                      </motion.p>

                      <motion.p
                        className={`text-xl leading-relaxed mb-8 font-light tracking-wide ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        {product.description}
                      </motion.p>
                      <motion.div
                        className={`text-lg whitespace-pre-line tracking-wide font-light text-left ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        {product.composition}
                      </motion.div>
                    </div>

                    {/* Size Selection */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <h3
                        className={`text-xl font-black tracking-wider mb-6 ${isDarkMode ? "text-white" : "text-black"}`}
                      >
                        РАЗМЕР
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                        {product.sizes.map((size, index) => (
                          <motion.button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`py-3 md:py-4 text-sm md:text-lg font-bold border-2 transition-all duration-300 rounded-lg ${
                              selectedSize === size
                                ? isDarkMode
                                  ? "border-white bg-white text-black"
                                  : "border-black bg-black text-white"
                                : isDarkMode
                                  ? "border-white/30 hover:border-white text-white"
                                  : "border-black/30 hover:border-black text-black"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 + index * 0.1 }}
                          >
                            {size}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    {/* Quantity */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                    >
                      <h3
                        className={`text-xl font-black tracking-wider mb-6 ${isDarkMode ? "text-white" : "text-black"}`}
                      >
                        КОЛИЧЕСТВО
                      </h3>
                      <div className="flex items-center space-x-6">
                        <motion.button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className={`p-4 border-2 transition-colors rounded-lg ${
                            isDarkMode
                              ? "border-white/30 hover:border-white text-white"
                              : "border-black/30 hover:border-black text-black"
                          }`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Minus className="w-6 h-6" />
                        </motion.button>
                        <span
                          className={`text-2xl font-bold w-16 text-center ${isDarkMode ? "text-white" : "text-black"}`}
                        >
                          {quantity}
                        </span>
                        <motion.button
                          onClick={() => setQuantity(quantity + 1)}
                          className={`p-4 border-2 transition-colors rounded-lg ${
                            isDarkMode
                              ? "border-white/30 hover:border-white text-white"
                              : "border-black/30 hover:border-black text-black"
                          }`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Plus className="w-6 h-6" />
                        </motion.button>
                      </div>
                    </motion.div>

                    {/* Add to Cart */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 }}
                    >
                      <Button
                        onClick={handleAddToCart}
                        disabled={!selectedSize}
                        data-add-to-cart
                        className={`w-full py-6 text-xl font-black tracking-wider transition-all duration-300 border-2 rounded-lg ${
                          selectedSize
                            ? isDarkMode
                              ? "bg-transparent border-white text-white hover:bg-white hover:text-black"
                              : "bg-transparent border-black text-black hover:bg-black hover:text-white"
                            : "bg-gray-500 text-gray-300 cursor-not-allowed border-gray-500"
                        }`}
                      >
                        {selectedSize ? "ДОБАВИТЬ В КОРЗИНУ" : "ВЫБЕРИТЕ РАЗМЕР"}
                      </Button>
                    </motion.div>

                    <motion.div
                      className={`text-sm space-y-3 font-light tracking-wide ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4 }}
                    >
                      <p>• ДОСТАВКА МЕЖГОРОД КАЗПОЧТА 1200 ₸ </p>
                      <p>• ОРИГИНАЛЬНЫЙ ДИЗАЙН OTRODYA</p>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.6 }}
            className="pt-24"
          >
            {/* Checkout Page */}
            <div className="max-w-6xl mx-auto px-8 py-16">
              <motion.h1
                className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-wider mb-12 md:mb-16 text-center ${isDarkMode ? "text-white" : "text-black"}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                ОФОРМЛЕНИЕ ЗАКАЗА
              </motion.h1>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                {/* Order Form */}
                <motion.div
                  initial={{ opacity: 0, x: -80 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1 }}
                >
                  <form onSubmit={handleOrderSubmit} className="space-y-8">
                    {/* Personal Information */}
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3
                        className={`text-xl md:text-2xl font-black tracking-wider flex items-center space-x-3 ${isDarkMode ? "text-white" : "text-black"}`}
                      >
                        <User className="w-5 h-5 md:w-6 md:h-6" />
                        <span>ЛИЧНЫЕ ДАННЫЕ</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label
                            htmlFor="firstName"
                            className={`text-lg font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                          >
                            ИМЯ *
                          </Label>
                          <Input
                            id="firstName"
                            value={orderForm.firstName}
                            onChange={(e) => setOrderForm({ ...orderForm, firstName: e.target.value })}
                            required
                            className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                              isDarkMode
                                ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                                : "bg-white border-black/30 text-black focus:border-black"
                            }`}
                            placeholder="Введите ваше имя"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="lastName"
                            className={`text-lg font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                          >
                            ФАМИЛИЯ *
                          </Label>
                          <Input
                            id="lastName"
                            value={orderForm.lastName}
                            onChange={(e) => setOrderForm({ ...orderForm, lastName: e.target.value })}
                            required
                            className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                              isDarkMode
                                ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                                : "bg-white border-black/30 text-black focus:border-black"
                            }`}
                            placeholder="Введите вашу фамилию"
                          />
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="email"
                          className={`text-lg font-bold tracking-wide flex items-center space-x-2 ${isDarkMode ? "text-white" : "text-black"}`}
                        >
                          <Mail className="w-4 h-4" />
                          <span>EMAIL *</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={orderForm.email}
                          onChange={(e) => setOrderForm({ ...orderForm, email: e.target.value })}
                          required
                          className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                            isDarkMode
                              ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                              : "bg-white border-black/30 text-black focus:border-black"
                          }`}
                          placeholder="example@email.com"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="phone"
                          className={`text-lg font-bold tracking-wide flex items-center space-x-2 ${isDarkMode ? "text-white" : "text-black"}`}
                        >
                          <Phone className="w-4 h-4" />
                          <span>ТЕЛЕФОН *</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={orderForm.phone}
                          onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                          required
                          className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                            isDarkMode
                              ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                              : "bg-white border-black/30 text-black focus:border-black"
                          }`}
                          placeholder="+7 (___) ___-__-__"
                        />
                      </div>
                    </motion.div>

                    {/* Delivery Address */}
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h3
                        className={`text-xl md:text-2xl font-black tracking-wider flex items-center space-x-3 ${isDarkMode ? "text-white" : "text-black"}`}
                      >
                        <MapPin className="w-5 h-5 md:w-6 md:h-6" />
                        <span>АДРЕС ДОСТАВКИ</span>
                      </h3>

                      <div>
                        <Label
                          htmlFor="city"
                          className={`text-lg font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                        >
                          ГОРОД *
                        </Label>
                        <Select
                          value={orderForm.city}
                          onValueChange={(value) => setOrderForm({ ...orderForm, city: value })}
                        >
                          <SelectTrigger
                            className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                              isDarkMode
                                ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                                : "bg-white border-black/30 text-black focus:border-black"
                            }`}
                          >
                            <SelectValue placeholder="Выберите город" />
                          </SelectTrigger>
                          <SelectContent
                            className={isDarkMode ? "bg-neutral-900 border-white/30" : "bg-white border-black/30"}
                          >
                            {kazakhstanCities.map((city) => (
                              <SelectItem
                                key={city}
                                value={city}
                                className={isDarkMode ? "text-white hover:bg-white/10" : "text-black hover:bg-black/10"}
                              >
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="address"
                          className={`text-lg font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                        >
                          АДРЕС *
                        </Label>
                        <Input
                          id="address"
                          value={orderForm.address}
                          onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                          required
                          className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                            isDarkMode
                              ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                              : "bg-white border-black/30 text-black focus:border-black"
                          }`}
                          placeholder="Улица, дом"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label
                            htmlFor="apartment"
                            className={`text-lg font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                          >
                            КВАРТИРА/ОФИС
                          </Label>
                          <Input
                            id="apartment"
                            value={orderForm.apartment}
                            onChange={(e) => setOrderForm({ ...orderForm, apartment: e.target.value })}
                            className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                              isDarkMode
                                ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                                : "bg-white border-black/30 text-black focus:border-black"
                            }`}
                            placeholder="Кв./офис"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="postalCode"
                            className={`text-lg font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                          >
                            ИНДЕКС
                          </Label>
                          <Input
                            id="postalCode"
                            value={orderForm.postalCode}
                            onChange={(e) => setOrderForm({ ...orderForm, postalCode: e.target.value })}
                            className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 ${
                              isDarkMode
                                ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                                : "bg-white border-black/30 text-black focus:border-black"
                            }`}
                            placeholder="000000"
                          />
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="comments"
                          className={`text-lg font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}
                        >
                          КОММЕНТАРИЙ К ЗАКАЗУ
                        </Label>
                        <Textarea
                          id="comments"
                          value={orderForm.comments}
                          onChange={(e) => setOrderForm({ ...orderForm, comments: e.target.value })}
                          className={`mt-2 py-4 text-lg border-2 rounded-lg transition-all duration-300 resize-none ${
                            isDarkMode
                              ? "bg-neutral-900 border-white/30 text-white focus:border-white"
                              : "bg-white border-black/30 text-black focus:border-black"
                          }`}
                          placeholder="Дополнительная информация для курьера..."
                          rows={4}
                        />
                      </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        type="submit"
                        className={`w-full py-6 text-xl font-black tracking-wider transition-all duration-300 border-2 rounded-lg ${
                          isDarkMode
                            ? "bg-transparent border-white text-white hover:bg-white hover:text-black"
                            : "bg-transparent border-black text-black hover:bg-black hover:text-white"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ОФОРМИТЬ ЗАКАЗ
                      </Button>
                    </motion.div>
                  </form>
                </motion.div>

                {/* Order Summary */}
                <motion.div
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <div className="sticky top-32">
                    <motion.div
                      className={`p-8 rounded-2xl border-2 ${
                        isDarkMode ? "bg-neutral-900 border-white/20" : "bg-white border-black/20"
                      }`}
                      style={{
                        boxShadow: isDarkMode
                          ? "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
                          : "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <h3
                        className={`text-xl md:text-2xl font-black tracking-wider mb-8 flex items-center space-x-3 ${isDarkMode ? "text-white" : "text-black"}`}
                      >
                        <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                        <span>ВАШ ЗАКАЗ</span>
                      </h3>

                      <div className="space-y-6">
                        {cart.map((item, index) => (
                          <motion.div
                            key={`${item.product.id}-${item.size}`}
                            className={`flex items-center space-x-4 p-4 rounded-lg border ${
                              isDarkMode ? "border-white/10 bg-neutral-800" : "border-black/10 bg-gray-50"
                            }`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                          >
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                              <Image
                                src={item.product.images.front || "/placeholder.svg"}
                                alt={item.product.name}
                                fill
                                className="object-contain"
                              />
                            </div>

                            <div className="flex-1">
                              <h4 className={`font-bold tracking-wide ${isDarkMode ? "text-white" : "text-black"}`}>
                                {item.product.name}
                              </h4>
                              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                Размер: {item.size} | Количество: {item.quantity}
                              </p>
                              <p className={`font-bold ${isDarkMode ? "text-white" : "text-black"}`}>
                                ₸{(item.product.price * item.quantity).toLocaleString()}
                              </p>
                            </div>

                            <motion.button
                              onClick={() => setCart(cart.filter((cartItem, cartIndex) => cartIndex !== index))}
                              className={`p-2 rounded-full transition-colors ${
                                isDarkMode
                                  ? "hover:bg-white/10 text-gray-400 hover:text-white"
                                  : "hover:bg-black/10 text-gray-600 hover:text-black"
                              }`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>

                      {/* Delivery Info */}
                      <motion.div
                        className={`mt-8 p-6 rounded-lg border ${
                          isDarkMode ? "border-white/10 bg-neutral-800" : "border-black/10 bg-gray-50"
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        <h4
                          className={`font-black tracking-wider mb-4 flex items-center space-x-2 ${isDarkMode ? "text-white" : "text-black"}`}
                        >
                          <Truck className="w-5 h-5" />
                          <span>ДОСТАВКА</span>
                        </h4>
                        <div className={`space-y-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          <p>• Астана — курьерская доставка через Яндекс Go</p>
                          <p>• Срок доставки: в течение дня или по согласованию</p>
                          <p>• Оплата: наличными или переводом при получении</p>
                          <p>• Межгород — доставка через транспортные компании</p>
                          <p>• Стоимость: 1200 ₸</p>
                          <p>• Срок доставки: 2–5 рабочих дней в зависимости от города</p>
                          <p>• Отправка по всему Казахстану</p>
                          <p>• Надёжная упаковка и трек-номер включены</p>
                        </div>
                      </motion.div>

                      {/* Total */}
                      <motion.div
                        className={`mt-8 pt-6 border-t ${isDarkMode ? "border-white/20" : "border-black/20"}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                      >
                        <div className="space-y-3">
                          <div
                            className={`flex justify-between text-lg ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                          >
                            <span>Товары:</span>
                            <span>₸{getTotalPrice().toLocaleString()}</span>
                          </div>
                          <div
                            className={`flex justify-between text-lg ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                          >
                            <span>Доставка:</span>
                            <span>₸{shippingCost().toLocaleString()}</span>
                          </div>
                          <div
                            className={`flex justify-between text-2xl font-black border-t pt-3 ${isDarkMode ? "text-white border-white/20" : "text-black border-black/20"}`}
                          >
                            <span>ИТОГО:</span>
                            <span>₸{(getTotalPrice() + shippingCost()).toLocaleString()}</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Security Info */}
                      <motion.div
                        className={`mt-6 text-xs space-y-2 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                      >
                        <p className="flex items-center space-x-2">
                          <Package className="w-4 h-4" />
                          <span>Безопасная упаковка</span>
                        </p>
                        <p>🔒 Ваши данные защищены</p>
                        <p>📞 Поддержка 24/7</p>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer
        className={`py-20 px-8 transition-colors duration-500 ${
          isDarkMode
            ? "bg-neutral-950 text-white border-t border-white/20"
            : "bg-neutral-50 text-black border-t border-black/20"
        }`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-[0.2em] md:tracking-[0.4em] mb-4 md:mb-6">
              OTRODYA
            </h3>
            <p
              className={`text-lg md:text-xl tracking-wider font-light ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              STREETWEAR BRAND
            </p>
            <div className="flex items-center justify-center space-x-8 mt-8">
              <Star className={`w-8 h-8 ${isDarkMode ? "text-white" : "text-black"}`} />
              <Star className={`w-6 h-6 ${isDarkMode ? "text-white" : "text-black"}`} />
              <Star className={`w-8 h-8 ${isDarkMode ? "text-white" : "text-black"}`} />
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-1 gap-8 md:gap-12 text-center justify-center"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[{ title: "СВЯЗЬ", items: ["TELEGRAM", "INSTAGRAM"] }].map((section) => (
              <motion.div key={section.title} variants={fadeInUp}>
                <h4 className="text-lg font-black tracking-wider mb-6">{section.title}</h4>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className={`text-lg font-light tracking-wide transition-colors ${
                          isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"
                        }`}
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className={`border-t mt-16 pt-12 text-center ${isDarkMode ? "border-white/20" : "border-black/20"}`}
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <p className={`text-sm tracking-wider font-normal ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              © 2025 OTRODYA. ВСЕ ПРАВА ЗАЩИЩЕНЫ.
            </p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  )
}
