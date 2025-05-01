package com.hackchal.recipes.viewmodel

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

// AuthService.kt
interface AuthService {
    @POST("/api/auth/login/")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("/api/users/")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthResponse>
}

data class LoginRequest(val username: String, val password: String)
data class SignUpRequest(val username: String, val email: String, val password: String)
data class AuthResponse(val success: Boolean, val data: UserData, val error: String?)
data class UserData(val message: String, val user: User)
data class User(val id: Int, val username: String, val email: String)