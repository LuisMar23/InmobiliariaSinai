import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChevronDown,
  faSignOutAlt,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../components/services/auth.service';
import { RouterModule } from '@angular/router';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-navbar',
  imports: [FontAwesomeModule, CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  faChevronDown = faChevronDown;
  faSignOutAlt = faSignOutAlt;
  faUser = faUser;

  isUserMenuOpen: boolean = false;
  showLogoutConfirmation: boolean = false;
  _authService = inject(AuthService);
  currentUser: any = null;
  
  private readonly encryptionKey = 'default-32-byte-key-for-aes-256-cbc!!';

  ngOnInit() {
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    const user = this._authService.getCurrentUser();
    
    if (user) {
      if (typeof user === 'string') {
        try {
          const bytes = CryptoJS.AES.decrypt(user, this.encryptionKey);
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          this.currentUser = JSON.parse(decryptedData);
        } catch (error) {
          console.error('Error desencriptando usuario:', error);
          this.currentUser = null;
        }
      } else if (typeof user === 'object') {
        this.currentUser = user;
      }
    }
    
    if (!this.currentUser && this._authService.isLoggedIn()) {
      const userData = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data from storage:', error);
        }
      }
    }
    
    if (!this.currentUser) {
      console.warn('No se pudo cargar el usuario actual');
    }
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.showLogoutConfirmation = false;
  }

  confirmLogout() {
    this.showLogoutConfirmation = true;
  }

  cancelLogout() {
    this.showLogoutConfirmation = false;
  }

  logout() {
    this._authService.logout();
  }
}