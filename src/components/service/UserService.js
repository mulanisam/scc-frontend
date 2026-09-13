import axios from "axios";
import { API_BASE_URL } from '../../config/axiosConfig.js';
import { jwtDecode } from "jwt-decode"; 
class UserService{
    

    /**
     * Signs in, and surfaces the server's own reason when it refuses.
     *
     * The rethrow used to be bare, so the login screen showed axios's message - "Request
     * failed with status code 401" - instead of "Those credentials were not accepted."
     * That was hidden until the server started answering failures with a real status: it
     * used to return HTTP 200 with the failure buried in the body, so axios never threw and
     * the screen read the message out of the response.
     */
    static async login(username, password){
        try{
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {username, password})
            return response.data;

        }catch(err){
            throw new Error(
                err.response?.data?.message
                || err.response?.data?.error
                || (err.response ? 'Sign-in failed. Please try again.'
                                 : 'Cannot reach the server. Check your connection.')
            );
        }
    }

    static async register(userData, token){
        try{
            const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, 
            {
                headers: {Authorization: `Bearer ${token}`}
            })
            return response.data;
        }catch(err){
            throw err;
        }
    }

    static async getAllUsers(token){
        try{
            const response = await axios.get(`${API_BASE_URL}/admin/get-all-users`, 
            {
                headers: {Authorization: `Bearer ${token}`}
            })
        
            return response.data;
        }catch(err){
            throw err;
        }
    }


    static async getYourProfile(token){
        try{
            const response = await axios.get(`${API_BASE_URL}/adminuser/get-profile`, 
            {
                headers: {Authorization: `Bearer ${token}`}
            })
            return response.data;
        }catch(err){
            throw err;
        }
    }

    static async getUserById(userId, token){
        try{
            const response = await axios.get(`${API_BASE_URL}/admin/get-users/${userId}`, 
            {
                headers: {Authorization: `Bearer ${token}`}
            })
            return response.data;
        }catch(err){
            throw err;
        }
    }

    static async deleteUser(userId, token){
        try{
            const response = await axios.delete(`${API_BASE_URL}/admin/delete/${userId}`, 
            {
                headers: {Authorization: `Bearer ${token}`}
            })
            return response.data;
        }catch(err){
            throw err;
        }
    }


    static async updateUser(userId, userData, token){
        try{
            const response = await axios.put(`${API_BASE_URL}/admin/update/${userId}`, userData,
            {
                headers: {Authorization: `Bearer ${token}`}
            })
            return response.data;
        }catch(err){
            throw err;
        }
    }

    /**AUTHENTICATION CHECKER */
    static logout(){
        localStorage.removeItem('token')
        localStorage.removeItem('role')
    }

    static isAuthenticated(){
        const token = localStorage.getItem('token');
        if (!token) return false;
    
        try {
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000; // Current time in seconds
    
            // Check if token is expired
            if (decodedToken.exp < currentTime) {
                this.logout(); // Optionally log out the user if token is expired
                return false;
            }
    
            return true;
        } catch (error) {
            console.error('Error decoding token:', error);
            this.logout(); // Optionally log out the user if there is an error
            return false;
        }
    }

    static isAdmin(){
        const role = localStorage.getItem('role')
        return role === 'ADMIN'
    }

    static isUser(){
        const role = localStorage.getItem('role')
        return role === 'USER'
    }

    static adminOnly(){
        return this.isAuthenticated() && this.isAdmin();
    }
// Add to UserService.js
    static isDriver() {
    const role = localStorage.getItem('role');
    return role === 'DRIVER';
    }

    static getDriverInfo() {
    const driverInfo = localStorage.getItem('driverInfo');
    return driverInfo ? JSON.parse(driverInfo) : null;
    }

    static setDriverInfo(driverInfo) {
    localStorage.setItem('driverInfo', JSON.stringify(driverInfo));
    }

    static getUserRole() {
    return localStorage.getItem('role');
    }

}

export default UserService;