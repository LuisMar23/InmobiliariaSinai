import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faChevronDown,
  faCog,
  faLayerGroup,
  faSearch,
  faShieldAlt,
  faSignOutAlt,
  faUser,
  faUserCircle,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../components/services/auth.service';
import { AppRoutingModule } from "../../../app.routes";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [FontAwesomeModule, CommonModule,RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  faBell = faBell;
  faUserCircle = faUserCircle;
  faChevronDown = faChevronDown;
  faSignOutAlt = faSignOutAlt;
  faUser = faUser;
  faShieldAlt = faShieldAlt;
  faLayerGroup = faLayerGroup;
  faSearch = faSearch;
  faCog = faCog;

  isUserMenuOpen: boolean = false;

  _authService = inject(AuthService);

  currentUser:any
ngOnInit(){
 this.currentUser=this._authService.getCurrentUser()
  console.log(this.currentUser)
}


  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  logout() {
    this._authService.logout();
  }
}
