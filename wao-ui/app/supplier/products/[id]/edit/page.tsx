"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = "http://localhost:8080/api/v1"

interface ProductOption {
  id: string
  code: string
  name: string
  price: number
  quantity: number
}

interface Product {
  id: string
  code: string
  name: string
  img: string
  options: ProductOption[]
}

export default function EditProductPage() {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [img, setImg] = useState("")
  const [options, setOptions] = useState<ProductOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProduct, setIsLoadingProduct] = useState(true)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/")
      return
    }

    // Parse token to check role
    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1]))
      if (tokenPayload.role !== "supplier") {
        router.push("/")
        return
      }
    } catch (error) {
      router.push("/")
      return
    }

    // Only fetch if we have a valid product ID
    if (params.id) {
      fetchProduct()
    }
  }, [router, params.id])

  const fetchProduct = async () => {
    setIsLoadingProduct(true)
    try {
      const response = await fetch(`${API_BASE_URL}/product/${params.id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const res: { data: Product } = await response.json()
        const product = res.data
        // Populate form fields with fetched data
        setCode(product.code || "")
        setName(product.name || "")
        setImg(product.img || "")

        // Handle options - ensure they have proper IDs for editing
        const formattedOptions = (product.options || []).map((option, index) => ({
          ...option,
          id: option.id || `existing-${index}-${Date.now()}`, // Ensure each option has an ID
        }))
        setOptions(formattedOptions)

        console.log("Product loaded:", product) // Debug log
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Product not found",
          variant: "destructive",
        })
        router.push("/supplier/products")
      }
    } catch (error) {
      console.error("Failed to fetch product:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
      router.push("/supplier/products")
    } finally {
      setIsLoadingProduct(false)
    }
  }

  const addOption = () => {
    const newOption: ProductOption = {
      id: Date.now().toString(),
      code: "",
      name: "",
      price: 0,
      quantity: 0,
    }
    setOptions([...options, newOption])
  }

  const updateOption = (id: string, field: keyof ProductOption, value: string | number) => {
    setOptions(options.map((option) => (option.id === id ? { ...option, [field]: value } : option)))
  }

  const removeOption = (id: string) => {
    setOptions(options.filter((option) => option.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const requestBody = {
        id: params.id, // Include the product ID
        code,
        name,
        img,
        options: options.map((option) => ({
          ...option,
          // Ensure numeric values are properly typed
          price: Number(option.price),
          quantity: Number(option.quantity),
        })),
      }

      console.log("Updating product with data:", requestBody) // Debug log

      const response = await fetch(`${API_BASE_URL}/product/${params.id}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const updatedProduct = await response.json()
        console.log("Product updated successfully:", updatedProduct)

        toast({
          title: "Success",
          description: "Product updated successfully",
        })
        router.push(`/supplier/products`)
      } else {
        const errorData = await response.json()
        console.error("Update failed:", errorData)

        toast({
          title: "Error",
          description: errorData.message || "Failed to update product",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingProduct) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading product...</div>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <Button variant="ghost" onClick={() => router.push(`/supplier/products`)} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Product
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
                <CardDescription>Update the basic details about your product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Product Code</Label>
                    <Input
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g., PIZZA_OLIVES"
                        required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Garlic-Scented - Adult Anchovy Olives"
                        required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="img">Image URL</Label>
                  <Input
                      id="img"
                      value={img}
                      onChange={(e) => setImg(e.target.value)}
                      placeholder="https://example.com/images/product.jpg"
                      required
                  />
                  {img && (
                      <div className="mt-2">
                        <img
                            src={img || "/placeholder.svg"}
                            alt="Product preview"
                            className="w-32 h-32 object-cover rounded-lg border"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                        />
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Product Options</CardTitle>
                    <CardDescription>Update different variants and pricing for your product</CardDescription>
                  </div>
                  <Button type="button" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option, index) => (
                    <div key={option.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Option {index + 1}</h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeOption(option.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Option Code</Label>
                          <Input
                              value={option.code}
                              onChange={(e) => updateOption(option.id, "code", e.target.value)}
                              placeholder="e.g., OPT_OLIVES_S_STANDARD"
                              required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Option Name</Label>
                          <Input
                              value={option.name}
                              onChange={(e) => updateOption(option.id, "name", e.target.value)}
                              placeholder="e.g., S (20cm) - Hand Toss"
                              required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Price</Label>
                          <Input
                              type="number"
                              value={option.price}
                              onChange={(e) => updateOption(option.id, "price", Number.parseInt(e.target.value) || 0)}
                              placeholder="1500"
                              required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                              type="number"
                              value={option.quantity}
                              onChange={(e) => updateOption(option.id, "quantity", Number.parseInt(e.target.value) || 0)}
                              placeholder="100"
                              required
                          />
                        </div>
                      </div>
                    </div>
                ))}
                {options.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No options added yet. Click "Add Option" to get started.
                    </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.push(`/supplier/products`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Product"}
              </Button>
            </div>
          </form>
        </main>
      </div>
  )
}
