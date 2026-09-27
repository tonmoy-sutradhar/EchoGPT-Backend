// src/modules/chat/chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RenameConversationDto } from './dto/rename-conversation.dto';
import { CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiOkResponse({ description: 'Conversation created successfully' })
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    const conversation = await this.chatService.createConversation(
      user.id,
      dto,
    );
    return { message: 'Conversation created successfully', data: conversation };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for the current user' })
  @ApiOkResponse({ description: 'Conversations fetched successfully' })
  async listConversations(@CurrentUser() user: AuthenticatedUser) {
    const conversations = await this.chatService.listConversations(user.id);
    return {
      message: 'Conversations fetched successfully',
      data: conversations,
    };
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation with its full message history' })
  @ApiOkResponse({ description: 'Conversation history fetched successfully' })
  async getConversationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const conversation = await this.chatService.getConversation(user.id, id);
    const messages = await this.chatService.getHistory(user.id, id);
    return {
      message: 'Conversation history fetched successfully',
      data: { conversation, messages },
    };
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Rename a conversation' })
  @ApiOkResponse({ description: 'Conversation renamed successfully' })
  async renameConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameConversationDto,
  ) {
    const conversation = await this.chatService.renameConversation(
      user.id,
      id,
      dto,
    );
    return { message: 'Conversation renamed successfully', data: conversation };
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiOkResponse({ description: 'Conversation deleted successfully' })
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.chatService.deleteConversation(user.id, id);
    return { message: 'Conversation deleted successfully', data: null };
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a prompt and receive the full AI response' })
  @ApiOkResponse({ description: 'Message sent and response received' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    const result = await this.chatService.sendMessage(user.id, dto);
    return { message: 'Response received successfully', data: result };
  }

  @Sse('stream')
  @ApiOperation({
    summary: 'Send a prompt and receive a streamed AI response (SSE)',
  })
  streamMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Query('prompt') prompt: string,
    @Query('conversationId') conversationId?: string,
    @Query('providerId') providerId?: string,
  ): Observable<MessageEvent> {
    const dto: SendMessageDto = { prompt, conversationId, providerId };

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          for await (const chunk of this.chatService.sendMessageStream(
            user.id,
            dto,
          )) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
          subscriber.complete();
        } catch (error) {
          subscriber.next({
            data: { event: 'error', message: (error as Error).message },
          } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }
}
