"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function NewProductPage() {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [img, setImg] = useState("")
  const [options, setOptions] = useState<ProductOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
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
  }, [router])

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
      const response = await fetch(`${API_BASE_URL}/product`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          code,
          name,
          img,
          options,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product created successfully",
        })
        router.push("/supplier/products")
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.message || "Failed to create product",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button variant="ghost" onClick={() => router.push("/supplier/products")} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>Basic details about your product</CardDescription>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Options</CardTitle>
                  <CardDescription>Different variants and pricing for your product</CardDescription>
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
            <Button type="button" variant="outline" onClick={() => router.push("/supplier/products")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
